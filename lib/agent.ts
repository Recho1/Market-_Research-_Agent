import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { TOOL_MAP, ALL_TOOLS } from "./tools";
import { buildMemoryContext, addShortTermMemory, addLongTermMemory, getCachedResponse, setCachedResponse } from "./memory";
import { retrieveRelevantContext, buildAgenticQuery } from "./rag";
import { logAgentRun, AgentTracer, buildObservabilityData } from "./observability";
import type { ChatRequest, ChatResponse, TokenUsage, ToolCall } from "@/types";

const PERSONALITY_PROMPTS = {
  formal:   `You are ARIA (Advanced Research & Intelligence Agent), an elite market research analyst. Communicate with executive-level formality. Use structured reports with clear sections, precise business terminology, and data-backed assertions. Quantify all claims with figures. Conclude every response with a "Key Takeaways" section.`,
  friendly: `You are ARIA (Advanced Research & Intelligence Agent), a knowledgeable and enthusiastic market research guide. Be warm and encouraging. Explain complex market dynamics using relatable analogies. End with 2-3 suggested follow-up questions the user might find valuable.`,
  concise:  `You are ARIA (Advanced Research & Intelligence Agent), a razor-sharp market analyst. Lead with the single most important number or insight. Use bullet points exclusively. No filler phrases. Every line must contain a specific fact or recommendation.`,
  balanced: `You are ARIA (Advanced Research & Intelligence Agent), a specialized market research analyst serving strategists, entrepreneurs, and investors. Be professional yet approachable. Structure responses with clear headers, support every claim with data, and close with concrete actionable recommendations.`,
};

const BASE_INSTRUCTIONS = `

RESPONSE RULES:
- Always use tools to gather fresh data before answering
- Lead with the most important insight then support with data
- For visualizations append a chart block:
\`\`\`chart
{"type":"bar","title":"Title","data":[{"name":"Label","value":100}],"xKey":"name","yKeys":["value"]}
\`\`\`
- Valid chart types: bar, line, area, pie
- Never fabricate statistics
- Decline requests unrelated to business or market research
- When documents are provided, analyze them and reference specific content`;

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o":        { input: 0.000005,   output: 0.000015  },
  "gpt-4o-mini":   { input: 0.00000015, output: 0.0000006 },
  "gpt-4-turbo":   { input: 0.00001,    output: 0.00003   },
  "gpt-3.5-turbo": { input: 0.0000005,  output: 0.0000015 },
};

function calcCost(model: string, inp: number, out: number) {
  const p = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o"];
  return inp * p.input + out * p.output;
}

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

async function withRetry<T>(
  fn: () => Promise<T>, maxRetries = 3, delayMs = 1000
): Promise<{ result: T; retries: number }> {
  let lastError: Error = new Error("Unknown");
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return { result: await fn(), retries: attempt }; }
    catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const retryable = lastError.message.includes("429") || lastError.message.includes("500") || lastError.message.includes("503") || lastError.message.includes("timeout");
      if (!retryable || attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export async function runMarketResearchAgent(req: ChatRequest): Promise<ChatResponse> {
  const { message, sessionId, userId, history, enabledTools, settings, attachments } = req;
  const startTime = Date.now();
  const tracer    = new AgentTracer();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Agent] Starting: "${message.slice(0, 80)}"`);
  console.log(`[Agent] Model: ${settings.model} | Tools: ${enabledTools.join(", ")}`);

  // 1. Cache check
  tracer.addStep("cache_check", "cache", message.slice(0, 80));
  const cached = getCachedResponse(message, enabledTools, settings.model);
  if (cached) {
    tracer.addStep("cache_hit", "cache", undefined, "Returned cached response");
    const obsData = buildObservabilityData(tracer, enabledTools, 0, [], 0, true, settings.model);
    return { content: cached.response, toolCalls: cached.toolCalls, tokenUsage: cached.tokenUsage, durationMs: Date.now() - startTime, cached: true, retries: 0, ragSources: [], observabilityData: obsData };
  }

  // 2. Agentic RAG
  tracer.addStep("rag_query_rewrite", "rag", message);
  const agenticQuery = buildAgenticQuery(message, history);
  tracer.addStep("rag_retrieval_start", "rag", agenticQuery);
  const { context: ragContext, sources: ragSources, scores: ragScores } = await retrieveRelevantContext(agenticQuery, 4);
  tracer.addStep("rag_retrieval_done", "rag", undefined, `${ragSources.length} chunks, scores: [${ragScores.map(s => s.toFixed(2)).join(", ")}]`);

  // 3. Memory
  const memoryContext = buildMemoryContext(sessionId, userId);
  tracer.addStep("memory_load", "memory", sessionId, memoryContext.length > 0 ? "context loaded" : "no prior context");

  // 4. Attachments
  let documentContext = "";
  if (attachments && attachments.length > 0) {
    documentContext = "\n\nUPLOADED DOCUMENTS:\n" +
      attachments.map(a => `[Document: ${a.name}]\n${a.content.slice(0, 3000)}`).join("\n\n---\n\n");
    tracer.addStep("document_load", "documents", `${attachments.length} files`, attachments.map(a => a.name).join(", "));
  }

  // 5. System prompt
  const personality  = (settings.personality || "balanced") as keyof typeof PERSONALITY_PROMPTS;
  const systemPrompt = PERSONALITY_PROMPTS[personality] + BASE_INSTRUCTIONS + ragContext + memoryContext + documentContext;

  // 6. Tools
  const activeTools = enabledTools.map(n => TOOL_MAP[n as keyof typeof TOOL_MAP]).filter(Boolean);
  const tools       = activeTools.length ? activeTools : ALL_TOOLS;
  tracer.addStep("tool_selection", "tools", enabledTools.join(", "), `${tools.length} tools active`);

  // 7. Model
  const model = new ChatOpenAI({
    modelName:        settings.model        || "gpt-4o",
    temperature:      settings.temperature  ?? 0.3,
    maxTokens:        settings.maxTokens    ?? 2000,
    topP:             settings.topP         ?? 1,
    frequencyPenalty: settings.frequencyPenalty ?? 0,
    presencePenalty:  settings.presencePenalty  ?? 0,
    apiKey:           process.env.OPENAI_API_KEY,
  }).bindTools(tools);

  const toolNode = new ToolNode(tools);

  async function callModel(state: typeof AgentState.State) {
    tracer.addStep("model_call", settings.model, `${state.messages.length} messages in context`);
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  function shouldContinue(state: typeof AgentState.State) {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    if (last.tool_calls?.length) {
      const names = last.tool_calls.map(t => t.name).join(", ");
      tracer.addStep("tool_routing", "router", `Routing to: ${names}`);
      return "tools";
    }
    tracer.addStep("final_answer", "router", undefined, "Generating final response");
    return END;
  }

  const graph = new StateGraph(AgentState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent")
    .compile();

  const initMessages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...history.map(m => m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)),
    new HumanMessage(message),
  ];

  // 8. Run
  const { result, retries } = await withRetry(() => graph.invoke({ messages: initMessages }), 3, 1000);

  // 9. Extract response
  const lastAI  = [...result.messages].reverse().find(m => m._getType() === "ai") as AIMessage;
  const content = typeof lastAI?.content === "string" ? lastAI.content : "";

  // 10. Tool calls
  const toolCalls: ToolCall[] = [];
  for (const msg of result.messages) {
    if (msg._getType() === "ai") {
      const ai = msg as AIMessage;
      for (const tc of ai.tool_calls || []) {
        toolCalls.push({ name: tc.name, input: tc.args as Record<string, unknown>, status: "success" });
        tracer.addStep("tool_execution", tc.name, JSON.stringify(tc.args).slice(0, 100), "completed");
      }
    }
  }

  // 11. Tokens
  const usage            = (lastAI as any)?.usage_metadata;
  const promptTokens     = usage?.input_tokens  || 0;
  const completionTokens = usage?.output_tokens || 0;
  const tokenUsage: TokenUsage = {
    promptTokens, completionTokens,
    totalTokens:      promptTokens + completionTokens,
    estimatedCostUsd: calcCost(settings.model || "gpt-4o", promptTokens, completionTokens),
  };

  // 12. Memory update
  addShortTermMemory(sessionId, message.slice(0, 60), content.slice(0, 200), toolCalls.length > 2 ? "high" : "medium");
  if (userId && toolCalls.length > 0) addLongTermMemory(userId, message.slice(0, 60), content.slice(0, 150), "high");

  // 13. Cache
  if (!attachments?.length) {
    setCachedResponse(message, enabledTools, settings.model, content, toolCalls, tokenUsage, 30);
  }

  // 14. Observability
  const observabilityData = buildObservabilityData(tracer, enabledTools, ragSources.length, ragScores, retries, false, settings.model);

  console.log(`[Agent] Done — ${toolCalls.length} tool calls · ${tokenUsage.totalTokens} tokens · ${observabilityData.agentSteps.length} steps`);
  console.log("=".repeat(60));

  logAgentRun({
    sessionId, message: message.slice(0, 80),
    toolsUsed:        toolCalls.map(t => t.name),
    tokensUsed:       tokenUsage.totalTokens,
    durationMs:       Date.now() - startTime,
    cached:           false,
    retries,
    personality:      settings.personality,
    model:            settings.model,
    ragChunks:        ragSources.length,
    ragScores,
    attachmentsCount: attachments?.length || 0,
    agentSteps:       tracer.getSteps(),
  });

  return {
    content,
    toolCalls,
    tokenUsage,
    durationMs:       Date.now() - startTime,
    cached:           false,
    retries,
    memoryUsed:       memoryContext.length > 0,
    ragSources,
    observabilityData,
  };
}

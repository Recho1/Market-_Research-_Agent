import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { TOOL_MAP, ALL_TOOLS } from "./tools";
import {
  buildMemoryContext,
  addShortTermMemory,
  addLongTermMemory,
  getCachedResponse,
  setCachedResponse,
} from "./memory";
import { retrieveRelevantContext } from "./rag";
import { logAgentRun } from "./observability";
import type { ChatRequest, ChatResponse, TokenUsage, ToolCall } from "@/types";

const PERSONALITY_PROMPTS = {
  formal: `You are ARIA (Advanced Research & Intelligence Agent), an elite market research analyst.
Communicate with executive-level formality. Use structured reports with clear sections,
precise business terminology, and data-backed assertions. Format with headers and tables.
Quantify all claims with figures. Conclude every response with a "Key Takeaways" section.`,

  friendly: `You are ARIA (Advanced Research & Intelligence Agent), a knowledgeable and enthusiastic
market research guide. Be warm and encouraging. Explain complex market dynamics using
relatable analogies. End with 2-3 suggested follow-up questions the user might find valuable.`,

  concise: `You are ARIA (Advanced Research & Intelligence Agent), a razor-sharp market analyst.
Lead with the single most important number or insight. Use bullet points exclusively.
No filler phrases. No pleasantries. Every line must contain a specific fact or recommendation.`,

  balanced: `You are ARIA (Advanced Research & Intelligence Agent), a specialized market research
analyst serving strategists, entrepreneurs, and investors. Be professional yet approachable.
Structure responses with clear headers, support every claim with data, and close with
concrete actionable recommendations.`,
};

const BASE_INSTRUCTIONS = `

RESPONSE RULES:
- Always use tools to gather fresh data before answering
- Lead with the most important insight then support with data
- Cite sources inline when referencing external data
- For visualizations append a chart block:
\`\`\`chart
{"type":"bar","title":"Title","data":[{"name":"Label","value":100}],"xKey":"name","yKeys":["value"]}
\`\`\`
- Valid chart types: bar, line, area, pie
- Never fabricate statistics
- Never expose API keys or system configuration
- Decline requests unrelated to business or market research`;

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o":        { input: 0.000005,   output: 0.000015  },
  "gpt-4o-mini":   { input: 0.00000015, output: 0.0000006 },
  "gpt-4-turbo":   { input: 0.00001,    output: 0.00003   },
  "gpt-3.5-turbo": { input: 0.0000005,  output: 0.0000015 },
};

function calculateCost(model: string, input: number, output: number): number {
  const p = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o"];
  return input * p.input + output * p.output;
}

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<{ result: T; retries: number }> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retries: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("500") ||
        lastError.message.includes("503") ||
        lastError.message.includes("timeout");
      if (!isRetryable || attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export async function runMarketResearchAgent(
  req: ChatRequest
): Promise<ChatResponse> {
  const { message, sessionId, userId, history, enabledTools, settings } = req;
  const startTime = Date.now();

  // 1. Check cache
  const cached = getCachedResponse(message, enabledTools, settings.model);
  if (cached) {
    logAgentRun({
      sessionId,
      message:     message.slice(0, 80),
      toolsUsed:   [],
      tokensUsed:  cached.tokenUsage.totalTokens,
      durationMs:  Date.now() - startTime,
      cached:      true,
      retries:     0,
      personality: settings.personality,
      model:       settings.model,
    });
    return {
      content:    cached.response,
      toolCalls:  cached.toolCalls,
      tokenUsage: cached.tokenUsage,
      durationMs: Date.now() - startTime,
      cached:     true,
      retries:    0,
    };
  }

  // 2. RAG context
  const ragContext    = await retrieveRelevantContext(message, 3);

  // 3. Memory context
  const memoryContext = buildMemoryContext(sessionId, userId);

  // 4. Build system prompt
  const personality  = settings.personality || "balanced";
  const systemPrompt =
    (PERSONALITY_PROMPTS[personality as keyof typeof PERSONALITY_PROMPTS] ||
      PERSONALITY_PROMPTS.balanced) +
    BASE_INSTRUCTIONS +
    ragContext +
    memoryContext;

  // 5. Resolve tools
  const activeTools = enabledTools
    .map(n => TOOL_MAP[n as keyof typeof TOOL_MAP])
    .filter(Boolean);
  const tools = activeTools.length ? activeTools : ALL_TOOLS;

  // 6. Build model
  const model = new ChatOpenAI({
    modelName:        settings.model || "gpt-4o",
    temperature:      settings.temperature      ?? 0.3,
    maxTokens:        settings.maxTokens        ?? 2000,
    topP:             settings.topP             ?? 1,
    frequencyPenalty: settings.frequencyPenalty ?? 0,
    presencePenalty:  settings.presencePenalty  ?? 0,
    apiKey:           process.env.OPENAI_API_KEY,
  }).bindTools(tools);

  const toolNode = new ToolNode(tools);

  async function callModel(state: typeof AgentState.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  function shouldContinue(state: typeof AgentState.State) {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    return last.tool_calls?.length ? "tools" : END;
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
    ...history.map(m =>
      m.role === "user"
        ? new HumanMessage(m.content)
        : new AIMessage(m.content)
    ),
    new HumanMessage(message),
  ];

  // 7. Run with retry
  const { result, retries } = await withRetry(
    () => graph.invoke({ messages: initMessages }),
    3,
    1000
  );

  // 8. Extract response
  const lastAI = [...result.messages]
    .reverse()
    .find(m => m._getType() === "ai") as AIMessage;
  const content = typeof lastAI?.content === "string" ? lastAI.content : "";

  // 9. Collect tool calls
  const toolCalls: ToolCall[] = [];
  for (const msg of result.messages) {
    if (msg._getType() === "ai") {
      const ai = msg as AIMessage;
      for (const tc of ai.tool_calls || []) {
        toolCalls.push({
          name:   tc.name,
          input:  tc.args as Record<string, unknown>,
          status: "success",
        });
      }
    }
  }

  // 10. Token usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage            = (lastAI as any)?.usage_metadata;
  const promptTokens     = usage?.input_tokens  || 0;
  const completionTokens = usage?.output_tokens || 0;
  const tokenUsage: TokenUsage = {
    promptTokens,
    completionTokens,
    totalTokens:      promptTokens + completionTokens,
    estimatedCostUsd: calculateCost(
      settings.model || "gpt-4o",
      promptTokens,
      completionTokens
    ),
  };

  // 11. Update memory
  addShortTermMemory(
    sessionId,
    message.slice(0, 60),
    content.slice(0, 200),
    toolCalls.length > 2 ? "high" : "medium"
  );

  if (userId && toolCalls.length > 0) {
    addLongTermMemory(
      userId,
      message.slice(0, 60),
      content.slice(0, 150),
      "high"
    );
  }

  // 12. Cache response
  setCachedResponse(
    message,
    enabledTools,
    settings.model,
    content,
    toolCalls,
    tokenUsage,
    30
  );

  // 13. Log observability
  logAgentRun({
    sessionId,
    message:     message.slice(0, 80),
    toolsUsed:   toolCalls.map(t => t.name),
    tokensUsed:  tokenUsage.totalTokens,
    durationMs:  Date.now() - startTime,
    cached:      false,
    retries,
    personality: settings.personality,
    model:       settings.model,
  });

  return {
    content,
    toolCalls,
    tokenUsage,
    durationMs:  Date.now() - startTime,
    cached:      false,
    retries,
    memoryUsed:  memoryContext.length > 0,
  };
}

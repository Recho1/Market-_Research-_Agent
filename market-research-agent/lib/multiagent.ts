import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const MODEL_CONFIG = {
  apiKey:      process.env.OPENAI_API_KEY,
  temperature: 0.3,
  maxTokens:   800,
};

async function marketDataAgent(query: string, context: string): Promise<string> {
  const model = new ChatOpenAI({ ...MODEL_CONFIG, modelName: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(`You are a Market Data Analyst specializing in market sizing,
TAM SAM SOM calculations, and growth projections. Given a research query and context,
provide specific market size figures, CAGR estimates, and growth drivers.
Be extremely concise — maximum 150 words. Lead with the most important number.`),
    new HumanMessage(`Query: ${query}\n\nContext: ${context}\n\nProvide market data insights:`),
  ]);
  return typeof response.content === "string" ? response.content : "";
}

async function competitiveIntelAgent(query: string, context: string): Promise<string> {
  const model = new ChatOpenAI({ ...MODEL_CONFIG, modelName: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(`You are a Competitive Intelligence Analyst specializing in
competitor mapping, market positioning, and competitive dynamics. Given a research
query and context, identify key players, their positioning, and competitive advantages.
Be extremely concise — maximum 150 words. Focus on actionable competitive insights.`),
    new HumanMessage(`Query: ${query}\n\nContext: ${context}\n\nProvide competitive intelligence:`),
  ]);
  return typeof response.content === "string" ? response.content : "";
}

async function strategyAdvisorAgent(query: string, context: string): Promise<string> {
  const model = new ChatOpenAI({ ...MODEL_CONFIG, modelName: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(`You are a Strategy Advisor specializing in market entry,
business model design, and strategic recommendations. Given a research query and context,
provide strategic recommendations and frameworks.
Be extremely concise — maximum 150 words. Focus on the 3 most important strategic actions.`),
    new HumanMessage(`Query: ${query}\n\nContext: ${context}\n\nProvide strategic recommendations:`),
  ]);
  return typeof response.content === "string" ? response.content : "";
}

async function riskAnalystAgent(query: string, context: string): Promise<string> {
  const model = new ChatOpenAI({ ...MODEL_CONFIG, modelName: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(`You are a Risk Analyst specializing in market risks,
regulatory challenges, and threat assessment. Given a research query and context,
identify the top risks and mitigation strategies.
Be extremely concise — maximum 150 words. List the 3 most critical risks.`),
    new HumanMessage(`Query: ${query}\n\nContext: ${context}\n\nProvide risk assessment:`),
  ]);
  return typeof response.content === "string" ? response.content : "";
}

async function orchestratorAgent(
  query:        string,
  agentOutputs: Record<string, string>
): Promise<string> {
  const model = new ChatOpenAI({
    ...MODEL_CONFIG,
    modelName: "gpt-4o",
    maxTokens: 1500,
  });
  const combinedInsights = Object.entries(agentOutputs)
    .map(([agent, output]) => `[${agent}]\n${output}`)
    .join("\n\n");
  const response = await model.invoke([
    new SystemMessage(`You are the Chief Research Officer at ARIA, an elite market
research firm. You receive inputs from specialized analyst agents and synthesize
them into a comprehensive, actionable research report.

Structure your response with these sections:
## Executive Summary
## Market Opportunity
## Competitive Landscape
## Strategic Recommendations
## Key Risks

Be comprehensive but concise. Use bullet points and specific numbers.
End with a clear recommendation or next step.`),
    new HumanMessage(
      `Original Research Query: ${query}\n\nSpecialist Agent Insights:\n${combinedInsights}\n\nSynthesize into a comprehensive market research report:`
    ),
  ]);
  return typeof response.content === "string" ? response.content : "";
}

export interface MultiAgentResult {
  finalReport:  string;
  agentOutputs: Record<string, string>;
  agentsUsed:   string[];
  durationMs:   number;
}

export async function runMultiAgentResearch(
  query:   string,
  context: string
): Promise<MultiAgentResult> {
  const startTime = Date.now();
  console.log("[MultiAgent] Starting parallel agent execution");

  const [marketData, competitive, strategy, risk] = await Promise.allSettled([
    marketDataAgent(query, context),
    competitiveIntelAgent(query, context),
    strategyAdvisorAgent(query, context),
    riskAnalystAgent(query, context),
  ]);

  const agentOutputs: Record<string, string> = {};
  if (marketData.status  === "fulfilled" && marketData.value)  agentOutputs["Market Data Analyst"]      = marketData.value;
  if (competitive.status === "fulfilled" && competitive.value) agentOutputs["Competitive Intelligence"] = competitive.value;
  if (strategy.status    === "fulfilled" && strategy.value)    agentOutputs["Strategy Advisor"]         = strategy.value;
  if (risk.status        === "fulfilled" && risk.value)        agentOutputs["Risk Analyst"]             = risk.value;

  console.log("[MultiAgent] Agents completed:", Object.keys(agentOutputs));

  const finalReport = await orchestratorAgent(query, agentOutputs);

  return {
    finalReport,
    agentOutputs,
    agentsUsed: Object.keys(agentOutputs),
    durationMs: Date.now() - startTime,
  };
}

export async function analyzeFeedbackPatterns(
  positiveSamples: string[],
  negativeSamples: string[]
): Promise<{ positiveTopics: string[]; negativeTopics: string[]; improvement: string }> {
  if (!positiveSamples.length && !negativeSamples.length) {
    return { positiveTopics: [], negativeTopics: [], improvement: "" };
  }
  const model = new ChatOpenAI({
    ...MODEL_CONFIG,
    modelName: "gpt-4o-mini",
    maxTokens: 400,
  });
  const response = await model.invoke([
    new SystemMessage(`You are a prompt optimization specialist. Analyze user feedback
patterns and identify what makes responses good or bad. Return a JSON object with:
{ positiveTopics: string[], negativeTopics: string[], improvement: string }
The improvement field should be a specific instruction to improve future responses.`),
    new HumanMessage(
      `Positively rated responses:\n${positiveSamples.slice(0, 3).join("\n---\n")}\n\n` +
      `Negatively rated responses:\n${negativeSamples.slice(0, 3).join("\n---\n")}\n\n` +
      `Analyze patterns and return JSON:`
    ),
  ]);
  try {
    const content = typeof response.content === "string" ? response.content : "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      positiveTopics: [],
      negativeTopics: [],
      improvement:    "Provide more specific data points and actionable recommendations.",
    };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const maxDuration = 30;

const HELP_SYSTEM_PROMPT = `You are ARIA Assistant, a helpful support agent embedded inside ARIA, an AI-powered Market Research platform used by business analysts, investors, startups, and enterprise strategy teams.

Your job is to help users get the most out of ARIA. You can answer:
- How to use ARIA features (tools, settings, personality modes)
- General business and market research questions
- Strategy, competitive analysis, and market sizing questions
- Prompt engineering tips to get better results from ARIA
- General knowledge questions a business professional might ask
- Career advice for analysts, consultants, and strategists

ARIA Platform Features:
- 9 AI tools: Web Search, Competitor Analysis, Market Sizing, Trend Analysis, Financial Data, SWOT Analysis, News Sentiment, Industry Reports, Currency Exchange
- 4 personality modes: Formal, Balanced, Friendly, Concise
- Model settings: Temperature, Max Tokens, Top P, Frequency Penalty, Presence Penalty
- Supported models: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- Multi-agent deep research: 4 specialist agents in parallel
- RAG knowledge base: Supabase pgvector
- PDF export, chat history, feedback learning, persistent memory

RESPONSE STYLE:
- Be concise, warm, and professional
- Use bullet points for lists of 3 or more items
- Keep responses under 150 words unless a detailed explanation is truly needed`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-key-here") {
      return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 500 });
    }
    const model = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0.5, maxTokens: 400, apiKey: process.env.OPENAI_API_KEY });
    const messages = [
      new SystemMessage(HELP_SYSTEM_PROMPT),
      ...(history || []).slice(-6).map((m: { role: string; content: string }) =>
        m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      new HumanMessage(message),
    ];
    const response = await model.invoke(messages);
    const content  = typeof response.content === "string" ? response.content : "";
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

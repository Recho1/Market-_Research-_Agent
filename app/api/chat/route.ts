import { NextRequest, NextResponse } from "next/server";
import { runMarketResearchAgent } from "@/lib/agent";
import { updateSessionStats, saveFeedback } from "@/lib/memory";
import type { ChatRequest, FeedbackEntry } from "@/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    if (!body.message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });
    if (body.message.length > 2000) return NextResponse.json({ error: "Message too long. Maximum 2000 characters." }, { status: 400 });
    if (!body.sessionId || typeof body.sessionId !== "string") return NextResponse.json({ error: "Valid session ID is required" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-key-here") {
      return NextResponse.json({ error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" }, { status: 500 });
    }
    const history = (body.history || []).slice(-20).filter(m => typeof m.role === "string" && typeof m.content === "string" && m.content.trim().length > 0);
    const response = await runMarketResearchAgent({ ...body, history });
    updateSessionStats(body.sessionId, response.tokenUsage.totalTokens, response.tokenUsage.estimatedCostUsd, response.toolCalls.length, response.durationMs, response.cached);
    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[Chat API Error]", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    const isAuth  = message.includes("401") || message.toLowerCase().includes("api key");
    return NextResponse.json({ error: isAuth ? "Invalid OpenAI API key." : `Agent error: ${message}` }, { status: isAuth ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, sessionId, rating, query, response, toolsUsed } = body;
    if (!messageId || !sessionId || !rating) return NextResponse.json({ error: "messageId, sessionId, and rating are required" }, { status: 400 });
    if (!["up", "down"].includes(rating)) return NextResponse.json({ error: "Rating must be 'up' or 'down'" }, { status: 400 });
    const entry: FeedbackEntry = { messageId, sessionId, rating, query: query || "", response: response || "", toolsUsed: toolsUsed || [], timestamp: new Date() };
    saveFeedback(entry);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

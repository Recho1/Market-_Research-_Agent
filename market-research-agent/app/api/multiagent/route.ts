import { NextRequest, NextResponse } from "next/server";
import { runMultiAgentResearch } from "@/lib/multiagent";
import { retrieveRelevantContext } from "@/lib/rag";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "sk-your-openai-key-here"
    ) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("[MultiAgent API] Request from session:", sessionId);

    const ragContext = await retrieveRelevantContext(message, 3);
    const result     = await runMultiAgentResearch(message, ragContext);

    return NextResponse.json({
      content:      result.finalReport,
      agentOutputs: result.agentOutputs,
      agentsUsed:   result.agentsUsed,
      durationMs:   result.durationMs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[MultiAgent API Error]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

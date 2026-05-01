import type { AgentStep, ObservabilityData } from "@/types";

// ── LangSmith (optional — graceful fallback if key missing) ───────────────────
let langsmithClient: unknown = null;

async function getLangSmithClient() {
  const key = process.env.LANGSMITH_API_KEY;
  if (!key || key === "your-langsmith-key-here") return null;
  try {
    const { Client } = await import("langsmith");
    if (!langsmithClient) {
      langsmithClient = new Client({
        apiKey:  key,
        apiUrl:  process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
      });
    }
    return langsmithClient as InstanceType<typeof import("langsmith").Client>;
  } catch { return null; }
}

// ── AgentTracer — local step-by-step tracing (works without LangSmith) ────────
export class AgentTracer {
  private steps: AgentStep[] = [];
  private startTime           = Date.now();
  private stepCounter         = 0;

  addStep(action: string, tool?: string, input?: string, output?: string) {
    this.stepCounter++;
    this.steps.push({
      step:       this.stepCounter,
      action,
      tool,
      input:      input  ? input.slice(0, 200)  : undefined,
      output:     output ? output.slice(0, 300) : undefined,
      durationMs: Date.now() - this.startTime,
      timestamp:  new Date().toISOString(),
    });
    // Always log to terminal so you can see steps in dev
    console.log(`[Tracer] Step ${this.stepCounter}: ${action}${tool ? ` (${tool})` : ""}${input ? ` — "${input.slice(0,60)}"` : ""}`);
  }

  getSteps()   { return this.steps; }
  getTotalMs() { return Date.now() - this.startTime; }
}

// ── Build observability payload ───────────────────────────────────────────────
export function buildObservabilityData(
  tracer:          AgentTracer,
  toolsConsidered: string[],
  ragChunks:       number,
  ragScores:       number[],
  retries:         number,
  cached:          boolean,
  model:           string
): ObservabilityData {
  const data: ObservabilityData = {
    agentSteps:         tracer.getSteps(),
    toolsConsidered,
    ragChunksRetrieved: ragChunks,
    ragRelevanceScores: ragScores,
    retryCount:         retries,
    cacheHit:           cached,
    totalLatencyMs:     tracer.getTotalMs(),
    modelUsed:          model,
  };
  console.log(`[Observability] Built: ${data.agentSteps.length} steps, ${ragChunks} RAG chunks, ${data.totalLatencyMs}ms`);
  return data;
}

// ── Log to LangSmith (fire-and-forget, never blocks) ─────────────────────────
export function logAgentRun(data: {
  sessionId:         string;
  message:           string;
  toolsUsed:         string[];
  tokensUsed:        number;
  durationMs:        number;
  cached:            boolean;
  retries:           number;
  personality:       string;
  model:             string;
  ragChunks?:        number;
  ragScores?:        number[];
  attachmentsCount?: number;
  agentSteps?:       AgentStep[];
}) {
  console.log(`[ARIA] Run complete — ${data.model} · ${data.tokensUsed} tokens · ${data.durationMs}ms · ${data.toolsUsed.length} tools · ${data.ragChunks || 0} RAG chunks · cached:${data.cached}`);

  // Fire-and-forget LangSmith logging
  getLangSmithClient().then(async (client) => {
    if (!client) return;
    try {
      const runId = Math.random().toString(36).slice(2);
      await client.createRun({
        id:         runId,
        name:       "aria-agent-run",
        run_type:   "chain",
        inputs:     { message: data.message, model: data.model, personality: data.personality },
        outputs:    { tokensUsed: data.tokensUsed, toolsUsed: data.toolsUsed, ragChunks: data.ragChunks },
        extra:      { metadata: { sessionId: data.sessionId, cached: data.cached, retries: data.retries, ragScores: data.ragScores, agentSteps: data.agentSteps } },
        start_time: Date.now() - data.durationMs,
        end_time:   Date.now(),
      });
      console.log("[LangSmith] Run logged:", runId);
    } catch (err) {
      console.warn("[LangSmith] Failed (non-critical):", String(err).slice(0, 100));
    }
  });
}

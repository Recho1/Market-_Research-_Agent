import { Client } from "langsmith";

let langsmithClient: Client | null = null;

export function getLangSmithClient(): Client | null {
  if (!process.env.LANGSMITH_API_KEY) return null;
  if (!langsmithClient) {
    langsmithClient = new Client({
      apiKey: process.env.LANGSMITH_API_KEY,
      apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
    });
  }
  return langsmithClient;
}

export async function logRun(data: {
  runName:    string;
  inputs:     Record<string, unknown>;
  outputs:    Record<string, unknown>;
  metadata:   Record<string, unknown>;
  error?:     string;
  durationMs: number;
}) {
  const client = getLangSmithClient();
  if (!client) return;
  try {
    const runId = Math.random().toString(36).slice(2);
    await client.createRun({
      id:         runId,
      name:       data.runName,
      run_type:   "chain",
      inputs:     data.inputs,
      outputs:    data.outputs,
      extra:      { metadata: data.metadata },
      error:      data.error,
      start_time: Date.now() - data.durationMs,
      end_time:   Date.now(),
    });
    console.log("[LangSmith] Run logged:", runId);
  } catch (err) {
    console.warn("[LangSmith] Failed to log run:", err);
  }
}

export async function logFeedbackToLangSmith(
  runId:   string,
  score:   number,
  comment: string
) {
  const client = getLangSmithClient();
  if (!client) return;
  try {
    await client.createFeedback(runId, "user_rating", { score, comment });
  } catch (err) {
    console.warn("[LangSmith] Failed to log feedback:", err);
  }
}

export function logAgentRun(data: {
  sessionId:   string;
  message:     string;
  toolsUsed:   string[];
  tokensUsed:  number;
  durationMs:  number;
  cached:      boolean;
  retries:     number;
  personality: string;
  model:       string;
}) {
  if (process.env.NODE_ENV === "development") {
    console.log("[ARIA Agent Run]", {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
  logRun({
    runName:    "aria-agent-run",
    inputs:     { message: data.message, model: data.model, personality: data.personality },
    outputs:    { tokensUsed: data.tokensUsed, toolsUsed: data.toolsUsed },
    metadata:   { sessionId: data.sessionId, cached: data.cached, retries: data.retries },
    durationMs: data.durationMs,
  });
}

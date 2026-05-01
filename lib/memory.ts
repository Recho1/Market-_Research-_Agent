import type { SessionStats, MemoryEntry, CacheEntry, FeedbackEntry, ToolCall, TokenUsage } from "@/types";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".aria-data");
const LTM_FILE = join(DATA_DIR, "long-term-memory.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadLongTermStore(): Map<string, MemoryEntry[]> {
  try {
    ensureDataDir();
    if (!existsSync(LTM_FILE)) return new Map();
    const raw = readFileSync(LTM_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, MemoryEntry[]>;
    const map = new Map<string, MemoryEntry[]>();
    for (const [k, v] of Object.entries(obj)) map.set(k, v);
    console.log("[Memory] Loaded long-term memory for", map.size, "users");
    return map;
  } catch { return new Map(); }
}

function saveLongTermStore() {
  try {
    ensureDataDir();
    const obj: Record<string, MemoryEntry[]> = {};
    for (const [k, v] of longTermStore) obj[k] = v;
    writeFileSync(LTM_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) { console.warn("[Memory] Failed to persist long-term memory:", err); }
}

interface Session {
  stats: SessionStats;
  shortTermMemory: MemoryEntry[];
  longTermMemory: MemoryEntry[];
  userContext: string;
  lastActive: Date;
  createdAt: Date;
}

const sessions      = new Map<string, Session>();
const cache         = new Map<string, CacheEntry>();
const feedback      = new Map<string, FeedbackEntry>();
const longTermStore = loadLongTermStore();

setInterval(() => {
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  for (const [id, s] of sessions) {
    if (s.lastActive < cutoff) sessions.delete(id);
  }
}, 30 * 60 * 1000);

setInterval(() => {
  const now = new Date();
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}, 10 * 60 * 1000);

setInterval(() => { saveLongTermStore(); }, 5 * 60 * 1000);

function getOrCreateSession(id: string): Session {
  if (!sessions.has(id)) {
    sessions.set(id, {
      stats: {
        totalMessages: 0, totalTokens: 0, totalCostUsd: 0,
        toolCallsCount: 0, avgResponseMs: 0, cacheHits: 0,
        positiveRatings: 0, negativeRatings: 0,
      },
      shortTermMemory: [], longTermMemory: [],
      userContext: "", lastActive: new Date(), createdAt: new Date(),
    });
  }
  const s = sessions.get(id)!;
  s.lastActive = new Date();
  return s;
}

export function updateSessionStats(
  id: string, tokens: number, cost: number,
  toolCount: number, durationMs: number, cached = false
) {
  const s = getOrCreateSession(id);
  const prev = s.stats.totalMessages;
  s.stats.totalMessages++;
  s.stats.totalTokens    += tokens;
  s.stats.totalCostUsd   += cost;
  s.stats.toolCallsCount += toolCount;
  s.stats.avgResponseMs   = Math.round(
    (s.stats.avgResponseMs * prev + durationMs) / s.stats.totalMessages
  );
  if (cached) s.stats.cacheHits++;
}

export function getSessionStats(id: string): SessionStats {
  return getOrCreateSession(id).stats;
}

export function addShortTermMemory(
  sessionId: string, topic: string, summary: string,
  importance: "low" | "medium" | "high" = "medium"
) {
  const s = getOrCreateSession(sessionId);
  const entry: MemoryEntry = {
    id: Math.random().toString(36).slice(2),
    sessionId, topic, summary, timestamp: new Date(), importance,
  };
  s.shortTermMemory.push(entry);
  if (s.shortTermMemory.length > 10) {
    const dropped = s.shortTermMemory.shift()!;
    if (dropped.importance === "high") {
      s.longTermMemory.push(dropped);
      if (s.longTermMemory.length > 50) s.longTermMemory.shift();
    }
  }
}

export function addLongTermMemory(
  userId: string, topic: string, summary: string,
  importance: "low" | "medium" | "high" = "high"
) {
  if (!longTermStore.has(userId)) longTermStore.set(userId, []);
  const mem = longTermStore.get(userId)!;
  mem.push({
    id: Math.random().toString(36).slice(2),
    sessionId: userId, topic, summary,
    timestamp: new Date(), importance,
  });
  if (mem.length > 100) mem.shift();
  saveLongTermStore();
}

export function getLongTermMemory(userId: string): MemoryEntry[] {
  return longTermStore.get(userId) || [];
}

export function buildMemoryContext(sessionId: string, userId?: string): string {
  const s = getOrCreateSession(sessionId);
  const parts: string[] = [];
  if (s.shortTermMemory.length > 0) {
    const recent = s.shortTermMemory.slice(-5).map(m => `- ${m.topic}: ${m.summary}`).join("\n");
    parts.push(`Recent context from this session:\n${recent}`);
  }
  if (userId) {
    const ltm = getLongTermMemory(userId).slice(-5);
    if (ltm.length > 0) {
      const longTerm = ltm.map(m => `- ${m.topic}: ${m.summary}`).join("\n");
      parts.push(`User research history (from previous sessions):\n${longTerm}`);
    }
  }
  return parts.length > 0 ? `\n\nCONTEXT FROM MEMORY:\n${parts.join("\n\n")}` : "";
}

function buildCacheKey(message: string, tools: string[], model: string): string {
  const normalized = message.toLowerCase().trim().replace(/\s+/g, " ");
  const toolKey    = [...tools].sort().join(",");
  return `${model}:${toolKey}:${normalized}`;
}

export function getCachedResponse(message: string, tools: string[], model: string): CacheEntry | null {
  const key   = buildCacheKey(message, tools, model);
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < new Date()) { cache.delete(key); return null; }
  entry.hits++;
  return entry;
}

export function setCachedResponse(
  message: string, tools: string[], model: string,
  response: string, toolCalls: ToolCall[], tokenUsage: TokenUsage, ttlMinutes = 30
) {
  const key = buildCacheKey(message, tools, model);
  cache.set(key, {
    key, response, toolCalls, tokenUsage, hits: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
}

export function getCacheStats(): { size: number; totalHits: number } {
  let totalHits = 0;
  for (const entry of cache.values()) totalHits += entry.hits;
  return { size: cache.size, totalHits };
}

export function saveFeedback(entry: FeedbackEntry) {
  feedback.set(entry.messageId, entry);
  const s = getOrCreateSession(entry.sessionId);
  if (entry.rating === "up")   s.stats.positiveRatings++;
  if (entry.rating === "down") s.stats.negativeRatings++;
  if (entry.rating === "down") {
    addShortTermMemory(
      entry.sessionId, "User feedback",
      `User rated this response poorly. Query: "${entry.query.slice(0, 80)}". Improve specificity and depth.`,
      "high"
    );
  }
  if (entry.rating === "up" && entry.sessionId) {
    addLongTermMemory(
      entry.sessionId, "Successful query",
      `User found this helpful: "${entry.query.slice(0, 80)}"`, "medium"
    );
  }
}

export function getFeedbackStats(): { total: number; positive: number; negative: number; satisfactionRate: number } {
  let positive = 0, negative = 0;
  for (const f of feedback.values()) {
    if (f.rating === "up")   positive++;
    if (f.rating === "down") negative++;
  }
  const total = positive + negative;
  return { total, positive, negative, satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0 };
}

export function clearSession(id: string) { sessions.delete(id); }

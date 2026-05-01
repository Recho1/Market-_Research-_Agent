export type MessageRole = "user" | "assistant" | "system" | "tool";
export type PersonalityMode = "formal" | "friendly" | "concise" | "balanced";
export type FeedbackRating = "up" | "down" | null;

export type ToolName =
  | "web_search"
  | "competitor_analysis"
  | "market_sizing"
  | "trend_analysis"
  | "financial_data"
  | "swot_analysis"
  | "news_sentiment"
  | "industry_reports"
  | "currency_exchange"
  | "document_analysis";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  metadata?: MessageMetadata;
  feedback?: FeedbackRating;
  cached?: boolean;
  retries?: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
}

export interface MessageMetadata {
  tokenUsage?: TokenUsage;
  sources?: Source[];
  personality?: PersonalityMode;
  durationMs?: number;
  ragSources?: RAGSource[];
  observabilityData?: ObservabilityData;
}

export interface RAGSource {
  title: string;
  content: string;
  similarity: number;
  category: string;
  source: string;
}

export interface ObservabilityData {
  agentSteps: AgentStep[];
  toolsConsidered: string[];
  ragChunksRetrieved: number;
  ragRelevanceScores: number[];
  retryCount: number;
  cacheHit: boolean;
  totalLatencyMs: number;
  modelUsed: string;
}

export interface AgentStep {
  step: number;
  action: string;
  tool?: string;
  input?: string;
  output?: string;
  durationMs: number;
  timestamp: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: "pending" | "success" | "error";
  durationMs?: number;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: Array<Record<string, string | number>>;
  xKey?: string;
  yKeys?: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface SessionStats {
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
  toolCallsCount: number;
  avgResponseMs: number;
  cacheHits: number;
  positiveRatings: number;
  negativeRatings: number;
  ragRetrievals: number;
  documentsUploaded: number;
}

export interface ModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  personality: PersonalityMode;
}

export interface MemoryEntry {
  id: string;
  sessionId: string;
  topic: string;
  summary: string;
  timestamp: Date;
  importance: "low" | "medium" | "high";
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  industry: string;
  verified: boolean;
  preferences: {
    defaultPersonality: PersonalityMode;
    defaultModel: string;
    enabledTools: ToolName[];
  };
  createdAt: Date;
}

export interface FeedbackEntry {
  messageId: string;
  sessionId: string;
  rating: "up" | "down";
  query: string;
  response: string;
  timestamp: Date;
  toolsUsed: string[];
}

export interface CacheEntry {
  key: string;
  response: string;
  toolCalls: ToolCall[];
  tokenUsage: TokenUsage;
  hits: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  userId?: string;
  history: { role: string; content: string }[];
  enabledTools: ToolName[];
  settings: ModelSettings;
  attachments?: Attachment[];
}

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
  tokenUsage: TokenUsage;
  durationMs: number;
  cached?: boolean;
  retries?: number;
  memoryUsed?: boolean;
  ragSources?: RAGSource[];
  observabilityData?: ObservabilityData;
}

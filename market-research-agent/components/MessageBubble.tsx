"use client";
import { useState } from "react";
import ChartRenderer from "./ChartRenderer";
import type { ChatMessage, ChartData, FeedbackRating } from "@/types";

function parseChart(content: string): { text: string; chart: ChartData | null } {
  const m = content.match(/```chart\n([\s\S]*?)```/);
  if (!m) return { text: content, chart: null };
  try {
    return {
      text:  content.replace(/```chart\n[\s\S]*?```/, "").trim(),
      chart: JSON.parse(m[1]),
    };
  } catch { return { text: content, chart: null }; }
}

function md(t: string): string {
  return t
    .replace(/^#### (.+)$/gm,  "<h4>$1</h4>")
    .replace(/^### (.+)$/gm,   "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,    "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,     "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`([^`]+)`/g,     "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#00ff88;text-decoration:underline;">$1</a>')
    .replace(/^- (.+)$/gm,     "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g,          "</p><p>")
    .replace(/^(?!<[huplo])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g,      "")
    .replace(/<p>(<[huo])/g,   "$1")
    .replace(/(<\/[huo][^>]*>)<\/p>/g, "$1");
}

async function submitFeedback(
  messageId: string,
  sessionId: string,
  rating: "up" | "down",
  query: string,
  response: string,
  toolsUsed: string[]
) {
  try {
    await fetch("/api/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, sessionId, rating, query, response, toolsUsed }),
    });
  } catch { /* silent */ }
}

export default function MessageBubble({
  message,
  sessionId,
  precedingUserMessage,
  onFeedback,
}: {
  message: ChatMessage;
  sessionId?: string;
  precedingUserMessage?: string;
  onFeedback?: (rating: "up" | "down") => void;
}) {
  const [showTools,  setShowTools]  = useState(false);
  const [feedback,   setFeedback]   = useState<FeedbackRating>(message.feedback ?? null);
  const [submitting, setSubmitting] = useState(false);

  const isUser   = message.role === "user";
  const { text, chart } = parseChart(message.content);
  const hasTools = !!message.toolCalls?.length;

  const handleFeedback = async (rating: "up" | "down") => {
    if (feedback || submitting || !sessionId) return;
    setSubmitting(true);
    setFeedback(rating);
    onFeedback?.(rating);
    await submitFeedback(
      message.id, sessionId, rating,
      precedingUserMessage || "",
      message.content,
      message.toolCalls?.map(t => t.name) || []
    );
    setSubmitting(false);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser
          ? "bg-[#ffb700]/10 border border-[#ffb700]/20"
          : "bg-[#00ff88]/10 border border-[#00ff88]/20"
      }`}>
        {isUser
          ? <span className="text-[#ffb700] text-xs font-bold">U</span>
          : <span className="text-[10px] font-bold text-[#00ff88]">AI</span>
        }
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Tool calls badge */}
        {hasTools && !isUser && (
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#404060] hover:text-[#00ff88] transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            {message.toolCalls!.length} tool{message.toolCalls!.length > 1 ? "s" : ""} used
            <span>{showTools ? "▲" : "▼"}</span>
          </button>
        )}

        {/* Tool calls expanded */}
        {showTools && hasTools && (
          <div className="w-full space-y-1 mb-1">
            {message.toolCalls!.map((tc, i) => (
              <div key={i} className="bg-[#0d0d14] border border-[#1a1a24] rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] flex-shrink-0" />
                <span className="text-[10px] font-mono text-[#00ff88]">{tc.name}</span>
                <span className="text-[10px] text-[#404060] truncate">
                  {JSON.stringify(tc.input).slice(0, 55)}…
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cached badge */}
        {message.cached && !isUser && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#7c7cff] mb-0.5">
            <span className="w-1 h-1 rounded-full bg-[#7c7cff]" />
            Cached response
          </div>
        )}

        {/* Retry badge */}
        {message.retries !== undefined && message.retries > 0 && !isUser && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#ffb700] mb-0.5">
            <span className="w-1 h-1 rounded-full bg-[#ffb700]" />
            Retried {message.retries}x
          </div>
        )}

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-[#1a1a24] border border-[#252533] text-[#e8e8f0] rounded-tr-sm"
            : "bg-[#111118] border border-[#1e1e2e] text-[#c8c8d8] rounded-tl-sm"
        }`}>
          {isUser
            ? <p className="whitespace-pre-wrap">{text}</p>
            : <div className="message-content" dangerouslySetInnerHTML={{ __html: md(text) }} />
          }
          {chart && !isUser && <ChartRenderer chart={chart} />}
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-2 mt-0.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-[#252535] font-mono">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.metadata?.tokenUsage && (
            <span className="text-[10px] font-mono text-[#252535]">
              {message.metadata.tokenUsage.totalTokens} tkns
              {" · "}
              ${message.metadata.tokenUsage.estimatedCostUsd.toFixed(4)}
            </span>
          )}
          {message.metadata?.durationMs && (
            <span className="text-[10px] font-mono text-[#252535]">
              {message.metadata.durationMs > 1000
                ? `${(message.metadata.durationMs / 1000).toFixed(1)}s`
                : `${message.metadata.durationMs}ms`}
            </span>
          )}

          {/* Feedback buttons */}
          {!isUser && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => handleFeedback("up")}
                disabled={!!feedback || submitting}
                title="Helpful"
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all text-xs font-bold ${
                  feedback === "up"
                    ? "bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88]"
                    : "border border-[#1e1e2e] text-[#404060] hover:border-[#00ff88]/30 hover:text-[#00ff88] disabled:cursor-default"
                }`}
              >
                +
              </button>
              <button
                onClick={() => handleFeedback("down")}
                disabled={!!feedback || submitting}
                title="Not helpful"
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all text-xs font-bold ${
                  feedback === "down"
                    ? "bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ff6b6b]"
                    : "border border-[#1e1e2e] text-[#404060] hover:border-[#ff6b6b]/30 hover:text-[#ff6b6b] disabled:cursor-default"
                }`}
              >
                −
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

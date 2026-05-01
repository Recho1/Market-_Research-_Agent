"use client";
import { useState } from "react";
import ChartRenderer from "./ChartRenderer";
import ObservabilityPanel from "./ObservabilityPanel";
import type { ChatMessage, ChartData, FeedbackRating } from "@/types";

function parseChart(content: string): { text: string; chart: ChartData | null } {
  const m = content.match(/```chart\n([\s\S]*?)```/);
  if (!m) return { text: content, chart: null };
  try { return { text: content.replace(/```chart\n[\s\S]*?```/, "").trim(), chart: JSON.parse(m[1]) }; }
  catch { return { text: content, chart: null }; }
}

function renderMarkdown(t: string): string {
  return t
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm,  "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,   "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,    "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`([^`]+)`/g,     "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm,     "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g,          "</p><p>")
    .replace(/^(?!<[huplo])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g,      "")
    .replace(/<p>(<[huo])/g,   "$1")
    .replace(/(<\/[huo][^>]*>)<\/p>/g, "$1");
}

async function submitFeedback(
  messageId: string, sessionId: string, rating: "up"|"down",
  query: string, response: string, toolsUsed: string[]
) {
  try {
    await fetch("/api/chat", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messageId, sessionId, rating, query, response, toolsUsed }),
    });
  } catch { /* silent */ }
}

export default function MessageBubble({
  message, sessionId, precedingUserMessage, onFeedback,
}: {
  message:               ChatMessage;
  sessionId?:            string;
  precedingUserMessage?: string;
  onFeedback?:           (rating: "up"|"down") => void;
}) {
  const [showTools,  setShowTools]  = useState(false);
  const [feedback,   setFeedback]   = useState<FeedbackRating>(message.feedback ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [showRAG,    setShowRAG]    = useState(false);

  const isUser   = message.role === "user";
  const { text, chart } = parseChart(message.content);
  const hasTools = !!message.toolCalls?.length;
  const hasRAG   = !!message.metadata?.ragSources?.length;
  const hasObs   = !isUser && !!message.metadata?.observabilityData && (message.metadata.observabilityData.agentSteps?.length ?? 0) > 0;

  const handleFeedback = async (rating: "up"|"down") => {
    if (feedback || submitting || !sessionId) return;
    setSubmitting(true); setFeedback(rating); onFeedback?.(rating);
    await submitFeedback(message.id, sessionId, rating, precedingUserMessage || "", message.content, message.toolCalls?.map(t=>t.name)||[]);
    setSubmitting(false);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${isUser ? "bg-[#ffb700]/10 border border-[#ffb700]/20" : "bg-[#00ff88]/10 border border-[#00ff88]/20"}`}>
        {isUser
          ? <span className="text-[#ffb700] text-xs font-bold leading-none">U</span>
          : <span className="text-[10px] font-bold text-[#00ff88] leading-none">AI</span>
        }
      </div>

      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Tool calls */}
        {hasTools && !isUser && (
          <button onClick={()=>setShowTools(!showTools)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-[#404060] hover:text-[#00ff88] transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"/>
            {message.toolCalls!.length} tool{message.toolCalls!.length>1?"s":""} used
            <span>{showTools?"▲":"▼"}</span>
          </button>
        )}

        {showTools && hasTools && (
          <div className="w-full space-y-1 mb-1">
            {message.toolCalls!.map((tc,i) => (
              <div key={i} className="bg-[#0d0d14] border border-[#1a1a24] rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] flex-shrink-0"/>
                <span className="text-[10px] font-mono text-[#00ff88]">{tc.name}</span>
                <span className="text-[10px] text-[#404060] truncate">{JSON.stringify(tc.input).slice(0,55)}…</span>
              </div>
            ))}
          </div>
        )}

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {message.cached && !isUser && (
            <div className="flex items-center gap-1 text-[9px] font-mono text-[#4ecdc4]">
              <span className="w-1 h-1 rounded-full bg-[#4ecdc4]"/>Cached
            </div>
          )}
          {(message.retries ?? 0) > 0 && !isUser && (
            <div className="flex items-center gap-1 text-[9px] font-mono text-[#ffb700]">
              <span className="w-1 h-1 rounded-full bg-[#ffb700]"/>Retried {message.retries}x
            </div>
          )}
          {hasRAG && !isUser && (
            <button onClick={()=>setShowRAG(!showRAG)}
              className="flex items-center gap-1 text-[9px] font-mono text-[#7c7cff] hover:text-[#a0a0ff] transition-colors">
              <span className="w-1 h-1 rounded-full bg-[#7c7cff]"/>
              {message.metadata!.ragSources!.length} RAG sources {showRAG?"▲":"▼"}
            </button>
          )}
        </div>

        {/* RAG sources */}
        {showRAG && hasRAG && (
          <div className="w-full space-y-1.5 mb-1">
            {message.metadata!.ragSources!.map((src,i) => (
              <div key={i} className="bg-[#0a0a0f] border border-[#1a1a24] rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#7c7cff]">{src.title}</span>
                  <span className={`text-[9px] font-mono ${src.similarity>0.7?"text-[#00ff88]":src.similarity>0.5?"text-[#ffb700]":"text-[#ff6b6b]"}`}>
                    {(src.similarity*100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-[10px] text-[#404060] leading-relaxed">{src.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed w-full ${isUser ? "bg-[#1a1a24] border border-[#252533] text-[#e8e8f0] rounded-tr-sm" : "bg-[#111118] border border-[#1e1e2e] text-[#c8c8d8] rounded-tl-sm"}`}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {message.attachments.map((att,i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[#1a1a24] border border-[#252533] rounded-lg px-2 py-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7c7cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="text-[10px] font-mono text-[#7c7cff]">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          {isUser
            ? <p className="whitespace-pre-wrap">{text}</p>
            : <div className="message-content" dangerouslySetInnerHTML={{__html: renderMarkdown(text)}}/>
          }
          {chart && !isUser && <ChartRenderer chart={chart}/>}
        </div>

        {/* Observability panel — shown directly under AI bubble */}
        {hasObs && (
          <div className="w-full">
            <ObservabilityPanel data={message.metadata!.observabilityData!}/>
          </div>
        )}

        {/* Footer row */}
        <div className={`flex items-center gap-2 mt-0.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-[#252535] font-mono">
            {message.timestamp.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
          </span>
          {message.metadata?.tokenUsage && (
            <span className="text-[10px] font-mono text-[#252535]">
              {message.metadata.tokenUsage.totalTokens} tkns · ${message.metadata.tokenUsage.estimatedCostUsd.toFixed(4)}
            </span>
          )}
          {message.metadata?.durationMs && (
            <span className="text-[10px] font-mono text-[#252535]">
              {message.metadata.durationMs > 1000 ? `${(message.metadata.durationMs/1000).toFixed(1)}s` : `${message.metadata.durationMs}ms`}
            </span>
          )}

          {/* Copy */}
          {!isUser && (
            <button onClick={handleCopy} title="Copy response"
              className="w-5 h-5 rounded-md flex items-center justify-center transition-all border border-[#1e1e2e] text-[#404060] hover:border-[#00ff88]/30 hover:text-[#00ff88]">
              {copied
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </button>
          )}

          {/* Thumbs feedback */}
          {!isUser && (
            <div className="flex items-center gap-1">
              <button onClick={()=>handleFeedback("up")} disabled={!!feedback||submitting} title="Helpful"
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${feedback==="up" ? "bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88]" : "border border-[#1e1e2e] text-[#404060] hover:border-[#00ff88]/30 hover:text-[#00ff88] disabled:cursor-default"}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={feedback==="up"?"#00ff88":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
              </button>
              <button onClick={()=>handleFeedback("down")} disabled={!!feedback||submitting} title="Not helpful"
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${feedback==="down" ? "bg-[#ff6b6b]/15 border border-[#ff6b6b]/30 text-[#ff6b6b]" : "border border-[#1e1e2e] text-[#404060] hover:border-[#ff6b6b]/30 hover:text-[#ff6b6b] disabled:cursor-default"}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={feedback==="down"?"#ff6b6b":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                  <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

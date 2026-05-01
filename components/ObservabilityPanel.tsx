"use client";
import { useState } from "react";
import type { ObservabilityData } from "@/types";

const STEP_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  rag:      { bg:"bg-[#7c7cff]/10", text:"text-[#7c7cff]", dot:"bg-[#7c7cff]"  },
  cache:    { bg:"bg-[#4ecdc4]/10", text:"text-[#4ecdc4]", dot:"bg-[#4ecdc4]"  },
  memory:   { bg:"bg-[#ff6b6b]/10", text:"text-[#ff6b6b]", dot:"bg-[#ff6b6b]" },
  model:    { bg:"bg-[#ffb700]/10", text:"text-[#ffb700]", dot:"bg-[#ffb700]"  },
  tool:     { bg:"bg-[#00ff88]/10", text:"text-[#00ff88]", dot:"bg-[#00ff88]"  },
  document: { bg:"bg-[#a78bfa]/10", text:"text-[#a78bfa]", dot:"bg-[#a78bfa]" },
  router:   { bg:"bg-[#94a3b8]/10", text:"text-[#94a3b8]", dot:"bg-[#94a3b8]" },
  default:  { bg:"bg-[#252533]",    text:"text-[#606080]", dot:"bg-[#606080]"  },
};

function getStepColor(action: string) {
  if (action.includes("rag"))      return STEP_COLORS.rag;
  if (action.includes("cache"))    return STEP_COLORS.cache;
  if (action.includes("memory"))   return STEP_COLORS.memory;
  if (action.includes("model"))    return STEP_COLORS.model;
  if (action.includes("tool"))     return STEP_COLORS.tool;
  if (action.includes("document")) return STEP_COLORS.document;
  if (action.includes("router") || action.includes("final") || action.includes("answer")) return STEP_COLORS.router;
  return STEP_COLORS.default;
}

export default function ObservabilityPanel({ data }: { data: ObservabilityData }) {
  const [expanded, setExpanded] = useState(false);

  const latency   = data.totalLatencyMs > 1000 ? `${(data.totalLatencyMs/1000).toFixed(1)}s` : `${data.totalLatencyMs}ms`;
  const avgScore  = data.ragRelevanceScores.length > 0
    ? (data.ragRelevanceScores.reduce((a,b) => a+b, 0) / data.ragRelevanceScores.length * 100).toFixed(0)
    : null;

  return (
    <div className="mt-2 w-full">
      {/* ── Trigger row — always visible ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-[10px] font-mono text-[#404060] hover:text-[#7c7cff] transition-colors group w-full"
      >
        <div className="flex items-center gap-1.5 flex-1">
          {/* Gear icon */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>

          {/* Step badges */}
          <span className="text-[#505070] group-hover:text-[#7c7cff] transition-colors">
            {data.agentSteps.length} steps
          </span>
          <span className="text-[#303050]">·</span>

          {/* RAG badge */}
          <span className={data.ragChunksRetrieved > 0 ? "text-[#7c7cff]" : "text-[#505070]"}>
            {data.ragChunksRetrieved} RAG
            {avgScore && <span className="text-[#404060] ml-0.5">({avgScore}%)</span>}
          </span>
          <span className="text-[#303050]">·</span>

          {/* Latency */}
          <span className="text-[#505070]">{latency}</span>

          {/* Cache hit */}
          {data.cacheHit && (
            <><span className="text-[#303050]">·</span><span className="text-[#4ecdc4]">cached</span></>
          )}

          {/* Retries */}
          {data.retryCount > 0 && (
            <><span className="text-[#303050]">·</span><span className="text-[#ffb700]">{data.retryCount} retries</span></>
          )}
        </div>

        {/* Expand toggle */}
        <span className="text-[#404060] group-hover:text-[#7c7cff] transition-colors flex-shrink-0">
          {expanded ? "▲ hide trace" : "▼ show trace"}
        </span>
      </button>

      {/* ── Expanded trace panel ── */}
      {expanded && (
        <div className="mt-2 bg-[#0a0a0f] border border-[#1a1a24] rounded-xl p-4 space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:"Steps",      value:data.agentSteps.length.toString(),                                  color:"text-[#7c7cff]"  },
              { label:"RAG Chunks", value:data.ragChunksRetrieved.toString(),                                  color:"text-[#00ff88]"  },
              { label:"Retries",    value:data.retryCount.toString(),                                          color:data.retryCount>0?"text-[#ffb700]":"text-[#505070]" },
              { label:"Latency",    value:latency,                                                             color:"text-[#4ecdc4]"  },
            ].map((s,i) => (
              <div key={i} className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-2 text-center">
                <div className={`text-sm font-mono font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] text-[#404060] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* RAG relevance scores */}
          {data.ragRelevanceScores.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest mb-2">
                RAG Relevance Scores — {data.ragRelevanceScores.length} chunks retrieved
              </p>
              <div className="space-y-1.5">
                {data.ragRelevanceScores.map((score, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#505070] w-4">#{i+1}</span>
                    <div className="flex-1 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${score * 100}%`,
                          backgroundColor: score > 0.7 ? "#00ff88" : score > 0.5 ? "#ffb700" : "#ff6b6b",
                        }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono w-10 text-right ${score > 0.7 ? "text-[#00ff88]" : score > 0.5 ? "text-[#ffb700]" : "text-[#ff6b6b]"}`}>
                      {(score * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent execution steps */}
          <div>
            <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest mb-2">
              Agent Execution Trace
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.agentSteps.map((step, i) => {
                const colors = getStepColor(step.action);
                return (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-[#111118] last:border-0">
                    <span className="text-[9px] font-mono text-[#303050] flex-shrink-0 mt-0.5 w-5">
                      {String(step.step).padStart(2, "0")}
                    </span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono flex-shrink-0 ${colors.bg} ${colors.text}`}>
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${colors.dot}`}/>
                      {step.action}
                    </div>
                    {step.tool && (
                      <span className="text-[9px] text-[#505070] flex-shrink-0 font-mono bg-[#111118] px-1.5 py-0.5 rounded">
                        {step.tool}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      {step.input && (
                        <p className="text-[9px] text-[#404060] truncate">{step.input}</p>
                      )}
                      {step.output && (
                        <p className="text-[9px] text-[#303050] truncate">{step.output}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-[#303050] flex-shrink-0">
                      {step.durationMs}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1a1a24]">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-[#404060]">
                Model: <span className="text-[#505070]">{data.modelUsed}</span>
              </span>
              <span className="text-[9px] font-mono text-[#404060]">
                Cache: <span className={data.cacheHit ? "text-[#4ecdc4]" : "text-[#505070]"}>{data.cacheHit ? "hit" : "miss"}</span>
              </span>
              <span className="text-[9px] font-mono text-[#404060]">
                Tools considered: <span className="text-[#505070]">{data.toolsConsidered.length}</span>
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#404060]">
              Total: <span className="text-[#4ecdc4]">{latency}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

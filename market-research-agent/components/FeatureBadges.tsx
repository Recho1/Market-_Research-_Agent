"use client";
import { useState } from "react";

const FEATURES = [
  {
    label: "RAG",
    color: "text-[#7c7cff] bg-[#7c7cff]/8 border-[#7c7cff]/20",
    dotColor: "bg-[#7c7cff]",
    title: "RAG Knowledge Base",
    description: "Retrieval Augmented Generation powered by Supabase pgvector. ARIA searches a curated knowledge base of market frameworks, financial metrics, and industry trends to enrich every response with proven methodologies.",
    stats: "6 knowledge domains · Cosine similarity search · Auto-seeded",
  },
  {
    label: "Multi-Agent",
    color: "text-[#ffb700] bg-[#ffb700]/8 border-[#ffb700]/20",
    dotColor: "bg-[#ffb700]",
    title: "Multi-Agent Deep Research",
    description: "Click the star button to deploy 4 specialist agents in parallel — Market Data Analyst, Competitive Intelligence, Strategy Advisor, and Risk Analyst. An orchestrator synthesizes their outputs into a comprehensive report.",
    stats: "4 agents in parallel · GPT-4o orchestrator · LangGraph coordination",
  },
  {
    label: "Memory",
    color: "text-[#00ff88] bg-[#00ff88]/8 border-[#00ff88]/20",
    dotColor: "bg-[#00ff88]",
    title: "Persistent Memory",
    description: "Short-term memory tracks your current session context. Long-term memory persists to disk across sessions — ARIA remembers your research history and learns from your feedback to improve future responses.",
    stats: "Short-term: 10 exchanges · Long-term: disk-persisted · Feedback learning",
  },
  {
    label: "PDF Export",
    color: "text-[#ff6b6b] bg-[#ff6b6b]/8 border-[#ff6b6b]/20",
    dotColor: "bg-[#ff6b6b]",
    title: "Professional PDF Reports",
    description: "Export any conversation as a formatted professional report with cover page, executive summary, table of contents, full conversation, key insights, methodology, and data sources.",
    stats: "Multi-page · Dark theme · Token cost breakdown",
  },
];

export default function FeatureBadges() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Badge row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className={`flex items-center gap-1.5 text-[9px] font-mono border rounded-full px-2.5 py-1 transition-all duration-200 ${f.color}
              ${active === i ? "ring-1 ring-offset-1 ring-offset-[#0a0a0f] ring-current scale-105" : "hover:scale-105"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${f.dotColor} ${active === i ? "" : "animate-pulse"}`} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Expanded detail card */}
      {active !== null && (
        <div className="w-full max-w-md animate-fade-in">
          <div className={`border rounded-xl p-4 bg-[#0d0d14] transition-all ${FEATURES[active].color.split(" ").filter(c => c.startsWith("border")).join(" ")}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${FEATURES[active].dotColor}`} />
                <span className={`text-xs font-semibold ${FEATURES[active].color.split(" ")[0]}`}>
                  {FEATURES[active].title}
                </span>
              </div>
              <button
                onClick={() => setActive(null)}
                className="text-[#404060] hover:text-[#e8e8f0] text-xs transition-colors"
              >
                x
              </button>
            </div>

            {/* Description */}
            <p className="text-[11px] text-[#a0a0b8] leading-relaxed mb-3">
              {FEATURES[active].description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-1">
              {FEATURES[active].stats.split(" · ").map((stat, si) => (
                <span
                  key={si}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#111118] border ${
                    FEATURES[active].color.split(" ").filter(c => c.startsWith("border")).join(" ")
                  } ${FEATURES[active].color.split(" ")[0]}`}
                >
                  {stat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

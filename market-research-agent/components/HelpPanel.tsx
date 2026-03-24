"use client";
import { useState } from "react";

const SECTIONS = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I run a market analysis?",
        a: "Just type your question naturally. Try: 'What is the market size of the global SaaS industry?' ARIA will automatically select the right tools and gather live data.",
      },
      {
        q: "Do I need API keys to use ARIA?",
        a: "You need an OpenAI API key (required). Serper.dev gives you live web search results. Alpha Vantage gives you real stock data. Without optional keys, ARIA uses sample data but still answers from its training knowledge.",
      },
      {
        q: "How do I get the best responses?",
        a: "Be specific about industry, region, and timeframe. Example: 'Analyze the top 5 EV competitors in Europe for 2025' gets much better results than 'tell me about EVs'.",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        q: "What does Web Search do?",
        a: "Queries Serper.dev (Google) in real time for the latest market news, reports, and statistics. Best for current events and recent data.",
      },
      {
        q: "What does Market Sizing do?",
        a: "Estimates TAM (Total Addressable Market), SAM (Serviceable Addressable Market), SOM (Serviceable Obtainable Market), and CAGR for any industry.",
      },
      {
        q: "What does Competitor Analysis do?",
        a: "Maps the competitive landscape of any industry — key players, market positioning, strengths, and regional presence.",
      },
      {
        q: "What does SWOT Analysis do?",
        a: "Generates a structured Strengths, Weaknesses, Opportunities, and Threats analysis for any company, product, or market entry strategy.",
      },
      {
        q: "What does Financial Data do?",
        a: "Fetches live stock quotes and financial metrics for publicly traded companies via Alpha Vantage. Requires ALPHA_VANTAGE_API_KEY.",
      },
      {
        q: "Can I disable tools?",
        a: "Yes. Go to the Tools tab in the sidebar and toggle any tool off. Disabled tools will not be available to the agent during that session.",
      },
    ],
  },
  {
    title: "Personality Modes",
    items: [
      {
        q: "What is Formal mode?",
        a: "Executive-level reports with precise terminology, structured sections, confidence intervals, and a Key Takeaways summary. Best for boardroom presentations.",
      },
      {
        q: "What is Balanced mode?",
        a: "Professional yet approachable. Structured with headers and data, but written for a general business audience. Good default for most use cases.",
      },
      {
        q: "What is Friendly mode?",
        a: "Warm and plain-language explanations with relatable analogies. Ends with suggested follow-up questions. Great for exploring a new market.",
      },
      {
        q: "What is Concise mode?",
        a: "Bullet points only. Numbers first. No filler. Maximum information density. Best when you need fast answers and know what you are looking for.",
      },
    ],
  },
  {
    title: "Model Settings",
    items: [
      {
        q: "What does Temperature control?",
        a: "Lower values (0.0-0.3) make responses more factual and deterministic. Higher values (0.7-1.0) make responses more creative and varied. For market research, keep it below 0.5.",
      },
      {
        q: "What does Top P control?",
        a: "Nucleus sampling threshold. Lower values make the model more focused. Works alongside Temperature — adjust one at a time for best results.",
      },
      {
        q: "What does Frequency Penalty do?",
        a: "Reduces repetition of the same words and phrases. Increase this if responses feel repetitive.",
      },
      {
        q: "What does Presence Penalty do?",
        a: "Encourages the model to explore new topics rather than staying on one theme. Increase for broader, more diverse analysis.",
      },
      {
        q: "Which model should I use?",
        a: "GPT-4o for the best quality analysis. GPT-4o Mini for fast and cheap responses. GPT-3.5 Turbo for quick tests. GPT-4 Turbo for long, detailed reports.",
      },
    ],
  },
  {
    title: "Example Prompts",
    items: [
      {
        q: "Market sizing example",
        a: "Try: 'What is the TAM, SAM, and SOM for a B2B HR software startup targeting SMEs in Southeast Asia through 2030?'",
      },
      {
        q: "Competitor analysis example",
        a: "Try: 'Analyze the top 6 competitors in the project management SaaS space globally, including their pricing models and target segments.'",
      },
      {
        q: "Trend analysis example",
        a: "Try: 'What are the top 5 technology and regulatory trends reshaping the insurtech market in Europe over the next 3 years?'",
      },
      {
        q: "Chart generation example",
        a: "Try: 'Show me the projected global cloud computing market growth from 2024 to 2030 as a chart.'",
      },
      {
        q: "SWOT example",
        a: "Try: 'Do a SWOT analysis for a new entrant launching a fintech payments app targeting unbanked populations in Sub-Saharan Africa.'",
      },
    ],
  },
];

export default function HelpPanel() {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest mb-3">
        Help & Guide
      </p>

      {SECTIONS.map((section, si) => (
        <div key={si} className="border border-[#1e1e2e] rounded-lg overflow-hidden">
          {/* Section header */}
          <button
            onClick={() => setOpenSection(openSection === si ? null : si)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#111118] hover:bg-[#1a1a24] transition-colors"
          >
            <span className="text-xs font-semibold text-[#c8c8d8]">
              {section.title}
            </span>
            <span className="text-[#505070] text-xs">
              {openSection === si ? "−" : "+"}
            </span>
          </button>

          {/* Section items */}
          {openSection === si && (
            <div className="divide-y divide-[#1a1a24]">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isOpen = openItem === key;
                return (
                  <div key={ii}>
                    <button
                      onClick={() => setOpenItem(isOpen ? null : key)}
                      className="w-full flex items-start justify-between px-3 py-2 hover:bg-[#111118] transition-colors text-left gap-2"
                    >
                      <span className="text-[11px] text-[#808090] leading-snug">
                        {item.q}
                      </span>
                      <span className="text-[#404060] text-xs flex-shrink-0 mt-0.5">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3">
                        <p className="text-[11px] text-[#606070] leading-relaxed bg-[#0d0d14] border border-[#1a1a24] rounded-lg p-2.5">
                          {item.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Quick reference */}
      <div className="mt-4 bg-[#00ff88]/5 border border-[#00ff88]/15 rounded-lg p-3">
        <p className="text-[10px] font-mono text-[#00ff88] uppercase tracking-widest mb-2">
          Quick Tips
        </p>
        <ul className="space-y-1.5">
          {[
            "Press Enter to send, Shift+Enter for new line",
            "Click suggested prompts on the home screen",
            "Toggle tools on/off in the Tools tab",
            "Click 'X tools used' on any message to see what ran",
            "Ask for a chart to get visual data",
            "Use Concise mode for quick research scans",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#00ff88] text-[10px] mt-0.5 flex-shrink-0">-</span>
              <span className="text-[11px] text-[#606070]">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

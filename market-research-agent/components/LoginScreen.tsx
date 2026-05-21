"use client";
import { useState } from "react";
import type { UserProfile } from "@/types";

const ROLES = [
  "Strategy Analyst",
  "Business Developer",
  "Investment Analyst",
  "Product Manager",
  "Entrepreneur / Founder",
  "Consultant",
  "Marketing Manager",
  "Research Analyst",
  "Other",
];

const INDUSTRIES = [
  "Technology / SaaS",
  "Financial Services",
  "Healthcare",
  "E-Commerce / Retail",
  "Energy & Utilities",
  "Real Estate",
  "Manufacturing",
  "Education",
  "Media & Entertainment",
  "Other",
];

interface LoginScreenProps {
  onLogin: (profile: UserProfile) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep]           = useState<1 | 2>(1);
  const [name, setName]           = useState("");
  const [role, setRole]           = useState("");
  const [industry, setIndustry]   = useState("");
  const [error, setError]         = useState("");

  function generateId() {
    return Math.random().toString(36).slice(2, 10);
  }

  const handleStep1 = () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setError(""); setStep(2);
  };

  const handleLogin = () => {
    if (!role)     { setError("Please select your role.");     return; }
    if (!industry) { setError("Please select your industry."); return; }
    setError("");
    const profile: UserProfile = {
      id: generateId(), name: name.trim(), role, industry,
      preferences: {
        defaultPersonality: "balanced",
        defaultModel: "gpt-4o",
        enabledTools: [
          "web_search","competitor_analysis","market_sizing",
          "trend_analysis","financial_data","swot_analysis",
        ],
      },
      createdAt: new Date(),
    };
    try { localStorage.setItem("aria_profile", JSON.stringify(profile)); }
    catch { /* ignore */ }
    onLogin(profile);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] grid-bg flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-md my-auto">

        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-[#00ff88]/3 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="text-center mb-4 relative">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center mb-2 signal-glow">
            <span className="text-base font-bold text-[#00ff88] signal-glow-text" style={{fontFamily:"Syne,sans-serif"}}>A</span>
          </div>
          <h1 className="text-lg font-bold text-[#e8e8f0]" style={{fontFamily:"Syne,sans-serif"}}>ARIA</h1>
          <p className="text-[10px] text-[#505070] font-mono">Advanced Research & Intelligence Agent</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5 shadow-2xl shadow-black/50 relative">

          {/* Step bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`flex-1 h-0.5 rounded-full transition-all ${step>=1?"bg-[#00ff88]":"bg-[#1e1e2e]"}`}/>
            <div className={`flex-1 h-0.5 rounded-full transition-all ${step>=2?"bg-[#00ff88]":"bg-[#1e1e2e]"}`}/>
          </div>

          {step === 1 ? (
            <>
              <h2 className="text-sm font-bold text-[#e8e8f0] mb-1" style={{fontFamily:"Syne,sans-serif"}}>
                Welcome — who are you?
              </h2>
              <p className="text-[11px] text-[#505070] mb-4">
                ARIA personalizes research to your context.
              </p>
              <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e=>{ setName(e.target.value); setError(""); }}
                onKeyDown={e=>e.key==="Enter"&&handleStep1()}
                placeholder="e.g. Alex Johnson"
                autoFocus
                className="w-full bg-[#111118] border border-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-[#303050] outline-none focus:border-[#00ff88]/30 transition-all"
              />
              {error && <p className="text-[11px] text-[#ff6b6b] mt-2">{error}</p>}
              <button
                onClick={handleStep1}
                disabled={!name.trim()}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 hover:border-[#00ff88]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}
              >
                Continue →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={()=>{setStep(1);setError("");}} className="text-[10px] font-mono text-[#505070] hover:text-[#e8e8f0] transition-colors">
                  ← back
                </button>
                <h2 className="text-sm font-bold text-[#e8e8f0]" style={{fontFamily:"Syne,sans-serif"}}>
                  Hi {name.split(" ")[0]}, your focus?
                </h2>
              </div>

              {/* Two columns side by side */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Role */}
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">
                    Your Role
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                    {ROLES.map(r => (
                      <button key={r} onClick={()=>{setRole(r);setError("");}}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] text-left transition-all ${
                          role===r
                            ? "border-[#00ff88]/35 bg-[#00ff88]/8 text-[#e8e8f0]"
                            : "border-[#1e1e2e] text-[#505070] hover:border-[#252533] hover:text-[#909090]"
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry */}
                <div>
                  <label className="text-[10px] font-mono text-[#505070] uppercase tracking-widest block mb-1.5">
                    Industry
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                    {INDUSTRIES.map(ind => (
                      <button key={ind} onClick={()=>{setIndustry(ind);setError("");}}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] text-left transition-all ${
                          industry===ind
                            ? "border-[#00ff88]/35 bg-[#00ff88]/8 text-[#e8e8f0]"
                            : "border-[#1e1e2e] text-[#505070] hover:border-[#252533] hover:text-[#909090]"
                        }`}>
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected summary */}
              {(role || industry) && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {role && (
                    <span className="text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/8 border border-[#00ff88]/20 rounded-full px-2 py-0.5">
                      {role}
                    </span>
                  )}
                  {industry && (
                    <span className="text-[10px] font-mono text-[#ffb700] bg-[#ffb700]/8 border border-[#ffb700]/20 rounded-full px-2 py-0.5">
                      {industry}
                    </span>
                  )}
                </div>
              )}

              {error && <p className="text-[11px] text-[#ff6b6b] mb-2">{error}</p>}

              <button
                onClick={handleLogin}
                disabled={!role || !industry}
                className="w-full py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/25 text-sm font-semibold text-[#00ff88] hover:bg-[#00ff88]/18 hover:border-[#00ff88]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{fontFamily:"Syne,sans-serif"}}
              >
                Enter ARIA →
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-[#252535] font-mono mt-3">
          Your data stays in your browser · No account required
        </p>
      </div>
    </div>
  );
}

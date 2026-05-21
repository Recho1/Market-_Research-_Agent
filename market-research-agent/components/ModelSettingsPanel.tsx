"use client";
import type { ModelSettings, PersonalityMode } from "@/types";

const MODELS = [
  { id: "gpt-4o",        label: "GPT-4o",        badge: "Best",  provider: "OpenAI" },
  { id: "gpt-4o-mini",   label: "GPT-4o Mini",   badge: "Fast",  provider: "OpenAI" },
  { id: "gpt-4-turbo",   label: "GPT-4 Turbo",   badge: "",      provider: "OpenAI" },
  { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", badge: "Cheap", provider: "OpenAI" },
];

const PERSONALITIES: { id: PersonalityMode; label: string; desc: string }[] = [
  { id: "formal",   label: "Formal",   desc: "Executive reports, precise terminology" },
  { id: "balanced", label: "Balanced", desc: "Professional yet approachable"          },
  { id: "friendly", label: "Friendly", desc: "Warm, plain language, follow-up tips"   },
  { id: "concise",  label: "Concise",  desc: "Bullets only, numbers first, no filler" },
];

function Slider({
  label, value, min, max, step, onChange, fmt, hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
  hint: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-[#808090]">{label}</span>
        <span className="text-xs font-mono text-[#00ff88]">
          {fmt(value)}{" "}
          <span className="text-[#505070]">{hint}</span>
        </span>
      </div>
      <div className="relative h-1.5 bg-[#252533] rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00cc6e] to-[#00ff88] rounded-full"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

export default function ModelSettingsPanel({
  settings,
  onChange,
}: {
  settings: ModelSettings;
  onChange: (s: ModelSettings) => void;
}) {
  const set = (k: keyof ModelSettings, v: string | number) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="space-y-5">

      {/* Personality */}
      <div>
        <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest mb-2">
          Personality
        </p>
        <div className="space-y-1.5">
          {PERSONALITIES.map(p => (
            <button
              key={p.id}
              onClick={() => set("personality", p.id)}
              className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                settings.personality === p.id
                  ? "border-[#00ff88]/40 bg-[#00ff88]/8"
                  : "border-[#1e1e2e] hover:border-[#252533]"
              }`}
            >
              <div className={`text-xs font-semibold ${settings.personality === p.id ? "text-[#00ff88]" : "text-[#808090]"}`}>
                {p.label}
              </div>
              <div className="text-[10px] text-[#404060] mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest mb-2">
          Model
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => set("model", m.id)}
              className={`p-2 rounded-lg border text-xs text-left transition-all ${
                settings.model === m.id
                  ? "border-[#00ff88]/40 bg-[#00ff88]/8 text-[#e8e8f0]"
                  : "border-[#1e1e2e] text-[#606080] hover:border-[#252533]"
              }`}
            >
              <div className="font-mono text-[11px]">{m.label}</div>
              {m.badge && (
                <div className={`text-[9px] ${settings.model === m.id ? "text-[#00ff88]" : "text-[#404060]"}`}>
                  {m.badge}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div>
        <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest mb-3">
          Parameters
        </p>
        <div className="space-y-4">
          <Slider
            label="Temperature"
            value={settings.temperature}
            min={0} max={1} step={0.05}
            onChange={v => set("temperature", v)}
            fmt={v => v.toFixed(2)}
            hint={settings.temperature < 0.3 ? "Precise" : settings.temperature < 0.7 ? "Balanced" : "Creative"}
          />
          <Slider
            label="Max Tokens"
            value={settings.maxTokens}
            min={256} max={4000} step={128}
            onChange={v => set("maxTokens", v)}
            fmt={v => v.toLocaleString()}
            hint={`~${Math.round(settings.maxTokens * 0.75)} words`}
          />
          <Slider
            label="Top P"
            value={settings.topP}
            min={0.1} max={1} step={0.05}
            onChange={v => set("topP", v)}
            fmt={v => v.toFixed(2)}
            hint="nucleus"
          />
          <Slider
            label="Frequency Penalty"
            value={settings.frequencyPenalty}
            min={0} max={2} step={0.1}
            onChange={v => set("frequencyPenalty", v)}
            fmt={v => v.toFixed(1)}
            hint="repetition"
          />
          <Slider
            label="Presence Penalty"
            value={settings.presencePenalty}
            min={0} max={2} step={0.1}
            onChange={v => set("presencePenalty", v)}
            fmt={v => v.toFixed(1)}
            hint="diversity"
          />
        </div>
      </div>

    </div>
  );
}

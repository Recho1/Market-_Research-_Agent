"use client";
import { useState } from "react";
import { TOOL_CONFIGS } from "@/lib/tools";
import type { ToolName } from "@/types";

const CORE_TOOLS   = TOOL_CONFIGS.filter(t => t.category === "core");
const PLUGIN_TOOLS = TOOL_CONFIGS.filter(t => t.category === "plugin");

function ToolRow({ tool, enabled, onToggle }: { tool: typeof TOOL_CONFIGS[0]; enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left group ${enabled?"border-[#00ff88]/20 bg-[#00ff88]/4 hover:border-[#00ff88]/35":"border-[#1a1a24] bg-transparent hover:border-[#252533] opacity-60"}`}>
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold font-mono transition-colors ${enabled?"bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88]":"bg-[#1a1a24] border border-[#252533] text-[#404060]"}`}>
        {tool.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold leading-tight ${enabled?"text-[#d0d0e0]":"text-[#505070]"}`}>{tool.label}</div>
        <div className="text-[9px] text-[#404060] leading-tight mt-0.5 truncate">{tool.description}</div>
      </div>
      <div className={`w-7 h-3.5 rounded-full flex items-center flex-shrink-0 transition-all ${enabled?"bg-[#00ff88]/25 justify-end":"bg-[#1e1e2e] justify-start"}`}>
        <div className={`w-2.5 h-2.5 rounded-full mx-0.5 transition-colors ${enabled?"bg-[#00ff88]":"bg-[#404060]"}`}/>
      </div>
    </button>
  );
}

export default function ToolPanel({ enabledTools, onToggle }: { enabledTools: ToolName[]; onToggle: (t: ToolName) => void }) {
  const [showPlugins, setShowPlugins] = useState(false);
  const pluginActive = PLUGIN_TOOLS.filter(t => enabledTools.includes(t.name)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest">Active Tools</p>
        <span className="text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/8 border border-[#00ff88]/15 rounded-full px-2 py-0.5">{enabledTools.length} on</span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest">Core</p>
        {CORE_TOOLS.map(tool=><ToolRow key={tool.name} tool={tool} enabled={enabledTools.includes(tool.name)} onToggle={()=>onToggle(tool.name)}/>)}
      </div>
      <div className="space-y-1.5">
        <button onClick={()=>setShowPlugins(p=>!p)} className="w-full flex items-center justify-between">
          <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest">
            Plugins{pluginActive>0&&<span className="ml-1.5 text-[#ffb700]">({pluginActive} active)</span>}
          </p>
          <span className="text-[10px] text-[#404060] hover:text-[#808090] transition-colors">{showPlugins?"−":"+"}</span>
        </button>
        {showPlugins ? (
          <div className="space-y-1.5">
            {PLUGIN_TOOLS.map(tool=><ToolRow key={tool.name} tool={tool} enabled={enabledTools.includes(tool.name)} onToggle={()=>onToggle(tool.name)}/>)}
          </div>
        ) : (
          <p className="text-[9px] text-[#303050] font-mono px-1">{PLUGIN_TOOLS.length} plugins available — click to expand</p>
        )}
      </div>
      <div className="flex gap-1.5 pt-1">
        <button onClick={()=>{[...CORE_TOOLS,...PLUGIN_TOOLS].forEach(t=>{if(!enabledTools.includes(t.name))onToggle(t.name);});}}
          className="flex-1 py-1.5 text-[9px] font-mono text-[#505070] hover:text-[#00ff88] border border-[#1e1e2e] hover:border-[#00ff88]/20 rounded-lg transition-all">All On</button>
        <button onClick={()=>{enabledTools.forEach(t=>onToggle(t));}}
          className="flex-1 py-1.5 text-[9px] font-mono text-[#505070] hover:text-[#ff6b6b] border border-[#1e1e2e] hover:border-[#ff6b6b]/20 rounded-lg transition-all">All Off</button>
      </div>
    </div>
  );
}

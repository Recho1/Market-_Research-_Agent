"use client";
import type { SessionStats } from "@/types";

function StatCard({ label, value, sub, color="default" }: { label:string; value:string; sub?:string; color?:"default"|"green"|"amber"|"red"|"blue" }) {
  const colors = { default:"text-[#e8e8f0]", green:"text-[#00ff88]", amber:"text-[#ffb700]", red:"text-[#ff6b6b]", blue:"text-[#7c7cff]" };
  return (
    <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-2.5">
      <div className={`text-sm font-mono font-semibold ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-[#404060] mt-0.5">{label}</div>
      {sub&&<div className="text-[9px] text-[#303050] mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color="#00ff88" }: { label:string; value:number; max:number; color?:string }) {
  const pct = max>0?Math.min((value/max)*100,100):0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-[#505070]">{label}</span>
        <span className="text-[10px] font-mono text-[#606070]">{value}</span>
      </div>
      <div className="h-1 bg-[#1a1a24] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,backgroundColor:color}}/>
      </div>
    </div>
  );
}

export default function TokenUsageDisplay({ stats }: { stats: SessionStats }) {
  const cost     = stats.totalCostUsd;
  const costStr  = cost<0.001?`$${(cost*1000).toFixed(3)}m`:`$${cost.toFixed(4)}`;
  const avgMs    = stats.avgResponseMs;
  const avgStr   = avgMs>1000?`${(avgMs/1000).toFixed(1)}s`:`${avgMs}ms`;
  const tokPerMsg = stats.totalMessages>0?Math.round(stats.totalTokens/stats.totalMessages):0;
  const totalRatings = stats.positiveRatings+stats.negativeRatings;
  const satisfaction = totalRatings>0?Math.round((stats.positiveRatings/totalRatings)*100):0;
  const cacheRate    = stats.totalMessages>0?Math.round((stats.cacheHits/stats.totalMessages)*100):0;

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-mono text-[#505070] uppercase tracking-widest">Session Analytics</p>
      <div className="grid grid-cols-2 gap-1.5">
        <StatCard label="Messages"    value={stats.totalMessages.toString()} sub={`${stats.toolCallsCount} tool calls`}/>
        <StatCard label="Est. Cost"   value={costStr} sub="OpenAI API" color="amber"/>
        <StatCard label="Tokens"      value={stats.totalTokens.toLocaleString()} sub={`~${tokPerMsg}/msg`} color="blue"/>
        <StatCard label="Avg Response" value={stats.totalMessages>0?avgStr:"--"} sub="per message" color="green"/>
      </div>
      {stats.totalMessages>0&&(
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3 space-y-3">
          <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest">Performance</p>
          <ProgressBar label="Cache Hit Rate"   value={cacheRate}    max={100} color="#7c7cff"/>
          <ProgressBar label="Satisfaction Rate" value={satisfaction} max={100} color="#00ff88"/>
          <ProgressBar label="Tool Usage"       value={stats.toolCallsCount} max={Math.max(stats.totalMessages*3,1)} color="#ffb700"/>
        </div>
      )}
      {totalRatings>0&&(
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3">
          <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest mb-2">User Feedback</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="text-sm font-mono text-[#00ff88]">{stats.positiveRatings}</div>
              <div className="text-[9px] text-[#404060]">Helpful</div>
            </div>
            <div className="w-px h-8 bg-[#1e1e2e]"/>
            <div className="flex-1 text-center">
              <div className="text-sm font-mono text-[#ff6b6b]">{stats.negativeRatings}</div>
              <div className="text-[9px] text-[#404060]">Not helpful</div>
            </div>
            <div className="w-px h-8 bg-[#1e1e2e]"/>
            <div className="flex-1 text-center">
              <div className="text-sm font-mono text-[#ffb700]">{satisfaction}%</div>
              <div className="text-[9px] text-[#404060]">Satisfied</div>
            </div>
          </div>
        </div>
      )}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-lg p-3">
        <p className="text-[9px] font-mono text-[#404060] uppercase tracking-widest mb-2">Breakdown</p>
        <div className="space-y-1.5">
          {[
            {label:"Total messages",  value:stats.totalMessages.toString()},
            {label:"Tool calls made", value:stats.toolCallsCount.toString()},
            {label:"Total tokens",    value:stats.totalTokens.toLocaleString()},
            {label:"Total cost",      value:costStr},
            {label:"Cache hits",      value:`${stats.cacheHits} (${cacheRate}%)`},
            {label:"Avg response",    value:stats.totalMessages>0?avgStr:"--"},
          ].map(row=>(
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-[10px] text-[#505070]">{row.label}</span>
              <span className="text-[10px] font-mono text-[#808090]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

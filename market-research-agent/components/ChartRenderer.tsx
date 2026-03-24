"use client";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { ChartData } from "@/types";

const COLORS = ["#00ff88","#ffb700","#7c7cff","#ff6b6b","#4ecdc4"];
const TT = { backgroundColor:"#1a1a24", border:"1px solid #32324a", borderRadius:"8px", color:"#e8e8f0", fontSize:"12px" };

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  const { type, title, data, xKey="name", yKeys=["value"] } = chart;
  return (
    <div className="mt-3 bg-[#111118] border border-[#252533] rounded-xl p-4">
      <h4 className="text-sm font-semibold text-[#e8e8f0] mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        {type==="bar" ? (
          <BarChart data={data} margin={{top:5,right:10,left:-10,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252533" />
            <XAxis dataKey={xKey} tick={{fill:"#606080",fontSize:11}} />
            <YAxis tick={{fill:"#606080",fontSize:11}} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{fontSize:"11px",color:"#808090"}} />
            {yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={COLORS[i%COLORS.length]} radius={[3,3,0,0]} />)}
          </BarChart>
        ) : type==="line" ? (
          <LineChart data={data} margin={{top:5,right:10,left:-10,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252533" />
            <XAxis dataKey={xKey} tick={{fill:"#606080",fontSize:11}} />
            <YAxis tick={{fill:"#606080",fontSize:11}} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{fontSize:"11px",color:"#808090"}} />
            {yKeys.map((k,i)=><Line key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{r:3}} />)}
          </LineChart>
        ) : type==="area" ? (
          <AreaChart data={data} margin={{top:5,right:10,left:-10,bottom:5}}>
            <defs>
              {yKeys.map((k,i)=>(
                <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS[i%COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252533" />
            <XAxis dataKey={xKey} tick={{fill:"#606080",fontSize:11}} />
            <YAxis tick={{fill:"#606080",fontSize:11}} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{fontSize:"11px",color:"#808090"}} />
            {yKeys.map((k,i)=>(
              <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i%COLORS.length]} fill={`url(#g${i})`} strokeWidth={2} />
            ))}
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} cx="50%" cy="50%" outerRadius={75}
              label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={TT} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

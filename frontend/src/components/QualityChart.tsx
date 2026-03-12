import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fetchScoreOverTime } from "../api/client";
import type { ScoreOverTime } from "../types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ScoreOverTime }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-xl text-sm border border-white/10">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-base">{d.avg_score.toFixed(1)} <span className="text-gray-500 text-xs font-normal">/ 10</span></p>
      <p className="text-gray-500 text-xs mt-0.5">{d.review_count} review{d.review_count !== 1 ? "s" : ""}</p>
    </div>
  );
}

export default function QualityChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["score-over-time", days],
    queryFn: () => fetchScoreOverTime(days),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-52 text-gray-600 text-sm">Loading…</div>
  );

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center h-52 gap-2">
      <p className="text-gray-500 text-sm">No review data yet</p>
      <p className="text-gray-700 text-xs">Open a pull request to trigger your first review</p>
    </div>
  );

  const chartData = data.map((d) => ({
    ...d,
    label: (() => { try { return format(parseISO(d.date), "MMM d"); } catch { return d.date; } })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
        <ReferenceLine y={7} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.3} />
        <Area type="monotone" dataKey="avg_score" stroke="#8b5cf6" strokeWidth={2}
          fill="url(#scoreGradient)"
          dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#a78bfa", strokeWidth: 2, stroke: "#1a1a2e" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

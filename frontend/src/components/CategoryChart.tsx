import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fetchCategoryBreakdown } from "../api/client";

const COLORS = ["#8b5cf6","#6366f1","#3b82f6","#10b981","#f59e0b","#f97316"];

export default function CategoryChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategoryBreakdown,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="flex items-center justify-center h-44 text-gray-600 text-sm">Loading…</div>;
  if (!data?.length) return <div className="flex items-center justify-center h-44 text-gray-600 text-sm">No data yet</div>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
        <XAxis dataKey="category" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#13131a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#9ca3af" }}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

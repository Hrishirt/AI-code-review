import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "violet" | "emerald" | "amber" | "blue" | "rose";
}

const accentMap = {
  violet:  { bg: "bg-violet-500/10",  icon: "text-violet-400",  border: "border-violet-500/20" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-400", border: "border-emerald-500/20" },
  amber:   { bg: "bg-amber-500/10",   icon: "text-amber-400",   border: "border-amber-500/20" },
  blue:    { bg: "bg-blue-500/10",    icon: "text-blue-400",    border: "border-blue-500/20" },
  rose:    { bg: "bg-rose-500/10",    icon: "text-rose-400",    border: "border-rose-500/20" },
};

export default function StatCard({ title, value, subtitle, icon: Icon, accent = "violet" }: StatCardProps) {
  const a = accentMap[accent];
  return (
    <div className="glass glass-hover rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg ${a.bg} border ${a.border}`}>
          <Icon className={`w-3.5 h-3.5 ${a.icon}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

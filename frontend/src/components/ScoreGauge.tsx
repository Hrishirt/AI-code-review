interface ScoreGaugeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { outer: 56,  stroke: 5,  fontSize: "text-base",  label: "text-[9px]" },
  md: { outer: 88,  stroke: 7,  fontSize: "text-2xl",   label: "text-[10px]" },
  lg: { outer: 120, stroke: 9,  fontSize: "text-3xl",   label: "text-xs" },
};

function scoreColor(score: number): { stroke: string; text: string; glow: string } {
  if (score >= 8) return { stroke: "#10b981", text: "#34d399", glow: "rgba(16,185,129,0.3)" };
  if (score >= 6) return { stroke: "#f59e0b", text: "#fbbf24", glow: "rgba(245,158,11,0.3)" };
  if (score >= 4) return { stroke: "#f97316", text: "#fb923c", glow: "rgba(249,115,22,0.3)" };
  return           { stroke: "#ef4444", text: "#f87171", glow: "rgba(239,68,68,0.3)" };
}

export default function ScoreGauge({ score, size = "md" }: ScoreGaugeProps) {
  const { outer, stroke, fontSize } = sizeMap[size];
  const radius = (outer - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? Math.max(0, Math.min(1, score / 10)) * circumference : 0;
  const colors = score !== null ? scoreColor(score) : { stroke: "#374151", text: "#6b7280", glow: "none" };

  return (
    <div
      className="relative inline-flex flex-col items-center justify-center"
      style={{ width: outer, height: outer }}
    >
      <svg width={outer} height={outer} className="-rotate-90" style={{ filter: score !== null ? `drop-shadow(0 0 8px ${colors.glow})` : "none" }}>
        <circle cx={outer/2} cy={outer/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle
          cx={outer/2} cy={outer/2} r={radius} fill="none"
          stroke={colors.stroke} strokeWidth={stroke}
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-bold leading-none ${fontSize}`} style={{ color: colors.text }}>
          {score !== null ? score.toFixed(1) : "—"}
        </span>
      </div>
    </div>
  );
}

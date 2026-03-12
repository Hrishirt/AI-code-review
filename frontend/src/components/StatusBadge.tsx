type Status = "pending" | "processing" | "completed" | "failed";

interface StatusBadgeProps { status: Status; }

const CFG: Record<Status, { label: string; cls: string; dot: string }> = {
  pending:    { label: "Pending",    cls: "badge-neutral",  dot: "bg-gray-500" },
  processing: { label: "Processing", cls: "badge-info",     dot: "bg-blue-400 animate-pulse" },
  completed:  { label: "Completed",  cls: "badge-success",  dot: "bg-emerald-400" },
  failed:     { label: "Failed",     cls: "badge-error",    dot: "bg-red-400" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = CFG[status] ?? CFG.pending;
  return (
    <span className={c.cls}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${c.dot}`} />
      {c.label}
    </span>
  );
}

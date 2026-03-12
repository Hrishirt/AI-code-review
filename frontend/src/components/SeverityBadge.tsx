type Severity = "error" | "warning" | "info" | null;

const CFG: Record<string, string> = {
  error:   "badge-error",
  warning: "badge-warning",
  info:    "badge-info",
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  if (!severity) return null;
  return <span className={CFG[severity] ?? "badge-neutral"}>{severity}</span>;
}

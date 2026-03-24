type Severity = "Low" | "Medium" | "High";

const severityStyles: Record<Severity, string> = {
  Low: "border-slate-200 bg-slate-100 text-slate-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-rose-200 bg-rose-50 text-rose-800",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityStyles[severity]}`}
    >
      {severity}
    </span>
  );
}

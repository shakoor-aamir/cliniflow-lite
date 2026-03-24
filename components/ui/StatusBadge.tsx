type StatusTone = "live" | "mock" | "error";

const statusStyles: Record<StatusTone, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-800",
  mock: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

const dotStyles: Record<StatusTone, string> = {
  live: "bg-emerald-500",
  mock: "bg-amber-500",
  error: "bg-rose-500",
};

export function StatusBadge({
  tone,
  label,
}: {
  tone: StatusTone;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[tone]}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles[tone]}`} />
      {label}
    </span>
  );
}

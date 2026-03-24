import { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  supporting,
}: {
  label: string;
  value: ReactNode;
  supporting?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <div className="mt-3 text-slate-900">{value}</div>
      {supporting ? <div className="mt-2 text-sm text-slate-600">{supporting}</div> : null}
    </div>
  );
}

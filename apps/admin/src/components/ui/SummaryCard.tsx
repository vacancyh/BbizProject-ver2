import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** SummaryCard — KPI 카드. PageHeader 다음 SummaryCards 블록. 증감 delta/dir 표기. */
export function SummaryCard({
  label,
  value,
  delta,
  dir,
  sub,
  icon,
  attn = false,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  dir?: "up" | "down";
  sub?: string;
  icon?: ReactNode;
  attn?: boolean;
}) {
  return (
    <div className={cn("rounded bg-surface p-4 shadow-xs", attn && "ring-1 ring-warning/40")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-2">{label}</span>
        {icon ? <span className="text-text-3">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums text-text">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {delta != null && dir ? (
          <span className={cn("flex items-center gap-0.5 font-bold", dir === "up" ? "text-success" : "text-danger")}>
            {dir === "up" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {Math.abs(delta)}%
          </span>
        ) : null}
        {sub ? <span className="text-text-3">{sub}</span> : null}
      </div>
    </div>
  );
}

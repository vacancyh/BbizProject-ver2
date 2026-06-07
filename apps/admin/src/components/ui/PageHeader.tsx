import type { ReactNode } from "react";
import { GapBadge } from "./GapBadge";

/** PageHeader — 화면 상단 제목/부제/액션. 패턴의 첫 블록. gap="B"면 신규기능 배지. */
export function PageHeader({
  title,
  sub,
  gap,
  actions,
}: {
  title: string;
  sub?: string;
  gap?: "A" | "B" | null;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-text">{title}</h1>
          {gap ? <GapBadge type={gap} /> : null}
        </div>
        {sub ? <div className="mt-1 text-sm text-text-2">{sub}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/** EmptyState — 데이터 없음/검색 결과 0 표시. action으로 후속 동작 버튼 슬롯. */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded bg-surface px-6 py-16 text-center">
      <div className="mb-1 text-text-3">{icon ?? <Inbox size={26} />}</div>
      <h4 className="text-sm font-bold text-text">{title}</h4>
      {description ? <p className="max-w-sm text-xs text-text-2">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { EmptyState } from "./EmptyState";

export type Column<T> = {
  /** 헤더 라벨 */
  header: string;
  /** 셀 렌더러 */
  cell: (row: T) => ReactNode;
  /** 우측 정렬(숫자) */
  numeric?: boolean;
  /** 헤더 폭(px/%) */
  width?: string;
};

/**
 * DataTable<T> — 제네릭 데이터 표. 공통 패턴의 핵심.
 * 로딩/빈상태 내장. 행 클릭(onRowClick) → DetailDrawer 연결 용도.
 * 도메인 루프에서 columns + data만 주입(스캐폴드는 동작 빈 표).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyTitle = "데이터가 없습니다",
  emptyDescription,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <div className="rounded bg-surface p-4 shadow-xs">
        <LoadingSkeleton rows={6} />
      </div>
    );
  }
  if (!data.length) {
    return (
      <div className="rounded bg-surface shadow-xs">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold text-text-2">
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={cn("px-4 py-3 font-bold", c.numeric && "text-right")}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr
                key={rowKey(row, ri)}
                className={cn(
                  "border-b border-border last:border-0",
                  onRowClick && "cursor-pointer hover:bg-surface-2"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c, ci) => (
                  <td key={ci} className={cn("px-4 py-3", c.numeric && "text-right tabular-nums")}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

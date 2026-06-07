"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pagination — 표 하단 페이지네이션. 페이지 클릭 시 onPageChange.
 * info(예: "1-50 / 1,240건") + 페이지 버튼.
 */
export function Pagination({
  page,
  pageCount,
  info,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  info?: string;
  onPageChange?: (page: number) => void;
}) {
  const go = (p: number) => {
    if (p < 1 || p > pageCount || p === page) return;
    onPageChange?.(p);
  };
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-xs text-text-2">
      {info ? <span>{info}</span> : null}
      <span className="flex-1" />
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-border disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: pageCount }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              type="button"
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-sm border px-1.5",
                p === page ? "border-primary bg-primary-weak font-bold text-primary" : "border-border"
              )}
              onClick={() => go(p)}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-border disabled:opacity-40"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
          aria-label="다음 페이지"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

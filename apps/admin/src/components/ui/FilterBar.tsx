"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

/**
 * FilterBar — 표 상단 검색/필터 줄. children에 select/segtab 등 필터 슬롯.
 * 패턴: PageHeader → SummaryCards → FilterBar → DataTable → DetailDrawer.
 */
export function FilterBar({
  searchPlaceholder = "검색",
  searchValue,
  onSearchChange,
  children,
}: {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded bg-surface p-3 shadow-xs">
      <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2.5">
        <Search size={16} className="text-text-3" />
        <input
          className="h-9 w-56 bg-transparent text-sm outline-none placeholder:text-text-3"
          placeholder={searchPlaceholder}
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      {children}
    </div>
  );
}

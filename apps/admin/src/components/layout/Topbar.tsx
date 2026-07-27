"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { logout } from "@/lib/api/client";

/** Topbar — 상단바. 검색/알림/관리자 프로필/로그아웃. */
export function Topbar() {
  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <div className="flex items-center gap-2 rounded-sm border border-border px-2.5">
        <Search size={16} className="text-text-3" />
        <input
          className="h-9 w-72 bg-transparent text-sm outline-none placeholder:text-text-3"
          placeholder="주문번호, 상품명, 회원명 검색"
        />
      </div>
      <div className="flex-1" />
      <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-sm text-text-2 hover:bg-surface-2" aria-label="알림">
        <Bell size={18} />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-danger" />
      </button>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-primary-weak text-sm font-bold text-primary">관</span>
        <span className="leading-tight">
          <b className="block text-sm">관리자</b>
          <span className="block text-xs text-text-3">최고관리자</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm text-text-2 hover:bg-surface-2"
        aria-label="로그아웃"
        data-testid="admin-logout"
      >
        <LogOut size={16} />
        로그아웃
      </button>
    </header>
  );
}

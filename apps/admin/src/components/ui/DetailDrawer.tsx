"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DetailDrawer — 행 상세 패널(중앙 모달/우측 드로어 겸용).
 * prototype의 openDetail 패턴 이식: 제목/상태/본문/푸터 슬롯 + ESC·백드롭 닫기.
 * 도메인 루프에서 body에 실데이터 상세 주입.
 */
export function DetailDrawer({
  open,
  title,
  status,
  sub,
  children,
  footer,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  status?: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded bg-surface shadow-lg",
          wide ? "max-w-4xl" : "max-w-2xl"
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text">{title}</h3>
              {status}
            </div>
            {sub ? <div className="mt-1 text-xs text-text-2">{sub}</div> : null}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-text-2 hover:bg-surface-2"
            onClick={onClose}
            aria-label="닫기 (ESC)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

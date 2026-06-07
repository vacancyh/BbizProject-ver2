"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ConfirmModal — 위험/중요 액션 확인 다이얼로그.
 * prototype confirm 패턴 이식: 되돌림 여부/대상/결과 메타 노출 + 위험 액션 강조.
 * 강제취소·삭제 등 한국형 이중확인 액션에 사용.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  meta,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  meta?: { target?: string; effect?: string; reversible?: boolean };
  /** 모달 본문 아래 추가 입력 UI (취소 사유 select 등) */
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded bg-surface p-5 text-center shadow-lg">
        <div
          className={cn(
            "mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-pill",
            danger ? "bg-danger-weak text-danger" : "bg-primary-weak text-primary"
          )}
        >
          {danger ? <AlertTriangle size={22} /> : <Info size={22} />}
        </div>
        <h3 className="text-base font-bold text-text">{title}</h3>
        {message ? <p className="mt-1.5 text-sm text-text-2">{message}</p> : null}
        {meta ? (
          <ul className="mt-3 space-y-1 rounded-sm bg-surface-2 p-3 text-left text-xs">
            {meta.target ? (
              <li className="flex justify-between gap-2">
                <span className="text-text-3">작업 대상</span>
                <span className="font-medium text-text">{meta.target}</span>
              </li>
            ) : null}
            {meta.effect ? (
              <li className="flex justify-between gap-2">
                <span className="text-text-3">작업 결과</span>
                <span className="font-medium text-text">{meta.effect}</span>
              </li>
            ) : null}
            {meta.reversible != null ? (
              <li className="flex justify-between gap-2">
                <span className="text-text-3">복구 여부</span>
                <span className={cn("font-medium", meta.reversible ? "text-success" : "text-danger")}>
                  {meta.reversible ? "되돌릴 수 있습니다" : "되돌릴 수 없습니다"}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
        {children ? <div className="mt-3 text-left">{children}</div> : null}
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-surface-2"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-sm px-4 py-2 text-sm font-bold text-white",
              danger ? "bg-danger hover:opacity-90" : "bg-primary hover:bg-primary-press"
            )}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

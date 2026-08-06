"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "danger";
type ToastItem = { id: number; message: string; tone: ToastTone };

type ToastApi = { show: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** useToast — 비차단 알림. 일반 저장/처리 완료 피드백에 사용. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 <ToastProvider> 내부에서만 사용할 수 있습니다.");
  return ctx;
}

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++seq;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  // value 를 메모이즈해야 소비자(useToast)의 참조가 안정적이다.
  // (미메모 시 토스트 발생→Provider 리렌더→새 value→useEffect 의존성 변동→무한 재요청)
  const value = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded bg-surface px-3.5 py-2.5 text-sm shadow-md"
            role="status"
            // 스토어프론트 토스트와 같은 훅 — E2E 에서 저장 성공/실패를 확인한다
            data-testid="toast"
            data-variant={t.tone}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-pill text-white",
                t.tone === "danger" ? "bg-danger" : t.tone === "info" ? "bg-info" : "bg-success"
              )}
            >
              {t.tone === "danger" ? <X size={13} /> : t.tone === "info" ? <Info size={13} /> : <Check size={13} />}
            </span>
            <span className="text-text">{t.message}</span>
            <button type="button" className="ml-1 text-text-3 hover:text-text" onClick={() => dismiss(t.id)} aria-label="닫기">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

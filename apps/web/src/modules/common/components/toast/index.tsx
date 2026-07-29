"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { clx } from "@modules/common/components/ui"

/**
 * 경량 토스트 알림 (2026-07-29 신설)
 *
 * 배경: Medusa 스타터에서 Toaster 를 걷어낸 뒤 "TODO: Re-add Toaster" 주석만 6곳 남아 있었고,
 *       그 결과 **장바구니 담기·비밀번호 변경 같은 동작의 성공/실패 피드백이 조용히 사라졌다.**
 *       사용자는 눌렀는데 아무 일도 안 일어난 것처럼 느낀다(실제로는 처리됨).
 *
 * 외부 의존성 없이 Context + 고정 영역으로 구현한다.
 * 접근성: role="status" + aria-live="polite" 로 스크린리더에도 알림이 전달된다.
 */
type ToastVariant = "success" | "error" | "info"
type ToastItem = { id: number; message: string; variant: ToastVariant }

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 3000

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    setToasts((prev) => [
      ...prev,
      // 같은 시각에 여러 개가 뜨어도 키가 겹치지 않도록 랜덤을 섞는다.
      { id: Date.now() + Math.random(), message, variant },
    ])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[200] bottom-4 left-1/2 -translate-x-1/2 small:left-auto small:right-6 small:translate-x-0 flex flex-col gap-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const Toast = ({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      data-testid="toast"
      data-variant={item.variant}
      className={clx(
        "pointer-events-auto flex items-start gap-x-3 rounded-rounded px-4 py-3 shadow-elevation-card-hover text-small-regular",
        {
          "bg-ui-fg-base text-ui-bg-base": item.variant === "info",
          "bg-emerald-700 text-white": item.variant === "success",
          "bg-rose-700 text-white": item.variant === "error",
        }
      )}
    >
      <span className="flex-1">{item.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}

/** 토스트 표시 훅. Provider 밖에서 호출하면 조용히 무시된다(렌더 깨짐 방지). */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  return ctx ?? { showToast: () => {} }
}

export default ToastProvider

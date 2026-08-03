"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 우편번호 검색 — 다음(카카오) Postcode 임베드(무료·키 불필요).
 *
 * ⚠️ 2026-08-03 수정: 이전에는 `.open()`(**팝업 창**) 방식이었다.
 *    실측 결과 클릭해도 화면에 아무 일이 일어나지 않았다:
 *      - `.open()` 은 새 창을 띄우는데, **브라우저 팝업 차단**에 걸린다.
 *        특히 `await loadScript()` 뒤에 호출돼 사용자 클릭 컨텍스트가 끊겨 차단 확률이 높다.
 *      - 차단돼도 `.open()` 은 예외를 던지지 않아 **폴백 안내조차 뜨지 않았다.**
 *        사용자 입장에선 "버튼이 고장났다"로 보인다.
 *      - 모바일에서는 새 탭으로 열려 UX 가 나쁘다.
 *
 *    → 국내 쇼핑몰 표준인 **페이지 내 레이어(모달)** 방식(`.embed()`)으로 바꿨다.
 *      팝업 차단과 무관하고, 모바일에서도 자연스럽다.
 *
 * 스크립트 로드 실패(네트워크 차단 등) 시에도 수기입력은 그대로 동작한다.
 */
export type PostcodeResult = {
  /** 5자리 우편번호 */
  zonecode: string
  /** 도로명 우선 전체 주소 (없으면 지번) */
  address: string
  /** 시/도 */
  sido: string
  /** 시/군/구 */
  sigungu: string
}

/** 비제어 폼(서버액션)의 input 값을 DOM 으로 주입 + React 동기화용 input 이벤트 발행 */
export function setFormInputValue(
  form: HTMLFormElement | null,
  name: string,
  value: string
) {
  if (!form) return
  const el = form.elements.namedItem(name) as HTMLInputElement | null
  if (!el) return
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

/** 다음 Postcode 콜백이 넘겨주는 필드 중 실제로 쓰는 것만 선언(외부 스크립트라 타입 미제공) */
export type DaumPostcodeResult = {
  zonecode?: string
  roadAddress?: string
  address?: string
  jibunAddress?: string
  sido?: string
  sigungu?: string
}

type DaumPostcodeGlobal = {
  Postcode: new (options: {
    oncomplete: (data: DaumPostcodeResult) => void
    onclose?: () => void
    width?: string | number
    height?: string | number
  }) => { open: () => void; embed: (el: HTMLElement) => void }
}

/** window.daum 접근(외부 스크립트 주입 전역) */
function getDaum(): DaumPostcodeGlobal | undefined {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { daum?: DaumPostcodeGlobal }).daum
}

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

let scriptPromise: Promise<void> | null = null

function loadPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  if (getDaum()?.Postcode) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error("postcode script load failed"))
    }
    // 스크립트가 응답 없이 매달리는 경우를 대비 — 사용자가 무한정 기다리게 두지 않는다.
    setTimeout(() => reject(new Error("postcode script timeout")), 10_000)
    document.head.appendChild(s)
  })
  return scriptPromise
}

const PostcodeSearch = ({
  onComplete,
  className,
  label = "우편번호 찾기",
}: {
  onComplete: (r: PostcodeResult) => void
  className?: string
  label?: string
}) => {
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  // 레이어가 열리면 그 안에 다음 우편번호 화면을 삽입한다.
  useEffect(() => {
    if (!open || !boxRef.current) return
    const daum = getDaum()
    if (!daum) {
      setUnavailable(true)
      setOpen(false)
      return
    }
    boxRef.current.innerHTML = ""
    new daum.Postcode({
      oncomplete: (data: DaumPostcodeResult) => {
        onComplete({
          zonecode: data.zonecode ?? "",
          address: data.roadAddress || data.address || data.jibunAddress || "",
          sido: data.sido ?? "",
          sigungu: data.sigungu ?? "",
        })
        setOpen(false)
      },
      onclose: () => setOpen(false),
      width: "100%",
      height: "100%",
    }).embed(boxRef.current)
  }, [open, onComplete])

  // 열려 있는 동안 배경 스크롤을 막고, ESC 로 닫는다.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const handleClick = useCallback(async () => {
    setLoading(true)
    setUnavailable(false)
    try {
      await loadPostcodeScript()
      if (!getDaum()?.Postcode) throw new Error("Postcode unavailable")
      setOpen(true)
    } catch {
      // 스크립트 차단/지연 — 수기입력 안내로 폴백(입력 자체는 계속 가능하다)
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="flex flex-col gap-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "h-11 px-4 border border-ui-border-base rounded-rounded text-small-regular text-ui-fg-base hover:bg-ui-bg-subtle disabled:opacity-50 whitespace-nowrap"
        }
        data-testid="postcode-search-button"
      >
        {loading ? "여는 중…" : label}
      </button>

      {unavailable && (
        <span className="text-xsmall-regular text-ui-fg-muted" role="status">
          우편번호 검색을 열 수 없어요. 주소를 직접 입력해 주세요.
        </span>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="우편번호 검색"
          data-testid="postcode-modal"
          onClick={(e) => {
            // 바깥 영역 클릭으로 닫기
            if (e.target === e.currentTarget) close()
          }}
        >
          <div className="w-full max-w-[500px] bg-white rounded-rounded overflow-hidden shadow-elevation-modal">
            <div className="flex items-center justify-between px-4 h-12 border-b border-ui-border-base">
              <span className="text-base-semi">우편번호 검색</span>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="text-ui-fg-subtle hover:text-ui-fg-base px-2 text-large-regular"
                data-testid="postcode-modal-close"
              >
                ✕
              </button>
            </div>
            {/* 다음 우편번호 화면이 이 안에 삽입된다 */}
            <div ref={boxRef} style={{ width: "100%", height: 460 }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default PostcodeSearch

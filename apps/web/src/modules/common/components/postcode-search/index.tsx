"use client"

import { useCallback, useState } from "react"

/**
 * 우편번호 검색 — 다음(카카오) Postcode 임베드(무료·키 불필요).
 * 버튼 클릭 시 스크립트를 1회 로드하고 검색 레이어를 띄운다.
 * 검색 완료 시 onComplete 로 { zonecode, address, sido, sigungu } 전달.
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

const SCRIPT_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"

let scriptPromise: Promise<void> | null = null

function loadPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject()
  if ((window as any).daum?.Postcode) return Promise.resolve()
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

  const open = useCallback(async () => {
    setLoading(true)
    try {
      await loadPostcodeScript()
      const daum = (window as any).daum
      new daum.Postcode({
        oncomplete: (data: any) => {
          onComplete({
            zonecode: data.zonecode ?? "",
            address: data.roadAddress || data.address || data.jibunAddress || "",
            sido: data.sido ?? "",
            sigungu: data.sigungu ?? "",
          })
        },
      }).open()
    } catch {
      // 스크립트 차단/오류 — 수기입력 안내로 폴백
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }, [onComplete])

  return (
    <div className="flex flex-col gap-y-1">
      <button
        type="button"
        onClick={open}
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
        <span className="text-xsmall-regular text-ui-fg-muted">
          우편번호 검색을 열 수 없어요. 직접 입력해 주세요.
        </span>
      )}
    </div>
  )
}

export default PostcodeSearch

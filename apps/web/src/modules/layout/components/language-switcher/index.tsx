"use client"

/**
 * 헤더 언어 전환기 (2026-08-10 신설)
 *
 * ── 왜 새로 만들었나 ────────────────────────────────────────────────────────
 * 기존 `language-select` 는 **사이드메뉴 전용**이다:
 *   · 열림/닫힘을 부모의 hover(`toggleState`)에 의존한다 — 헤더에서는 hover 로 열 수 없다
 *   · `min-w-[320px]` · 위쪽으로 펼쳐짐(`-bottom-…`) — 헤더 높이(64px)에 안 맞는다
 * 그래서 헤더용으로 **스스로 열고 닫는 컴팩트 버전**을 따로 만들었다.
 *
 * ── 동작 ────────────────────────────────────────────────────────────────────
 * 언어는 `_medusa_locale` 쿠키 하나로 정해진다. 이 쿠키가 **콘텐츠 번역(상품명 등)과
 * UI 라벨 둘 다**를 바꾼다. 기본값(쿠키 없음)은 한국어다.
 *
 * ── 접근성 ──────────────────────────────────────────────────────────────────
 * ESC · 바깥 클릭으로 닫히고, 현재 언어에 `aria-current` 를 준다.
 * 버튼은 모바일에서도 누를 수 있게 최소 24px 높이를 확보한다.
 */
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { updateLocale } from "@lib/data/locale-actions"
import type { Locale } from "@lib/data/locales"

type Props = {
  locales: Locale[]
  currentLocale: string | null
}

/** "ko-KR" → "한국어" 처럼 **그 언어 자신의 표기**로 보여준다(영어 화면에서도 "한국어"). */
function nativeName(code: string, fallback: string): string {
  try {
    const lang = code.split(/[-_]/)[0]
    return new Intl.DisplayNames([code], { type: "language" }).of(lang) ?? fallback
  } catch {
    return fallback
  }
}

/** 버튼에 넣을 짧은 표기: "ko-KR" → "KO" */
function shortCode(code: string): string {
  return (code.split(/[-_]/)[0] || code).toUpperCase()
}

export default function LanguageSwitcher({ locales, currentLocale }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const boxRef = useRef<HTMLDivElement>(null)

  // 지원 언어가 1개 이하면 고를 게 없다 — 아예 렌더하지 않는다
  const hasChoice = (locales?.length ?? 0) > 1

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  if (!hasChoice) return null

  // 쿠키가 없으면 첫 번째(= 기본 언어, 한국어)로 표시한다
  const active =
    locales.find((l) => l.code.toLowerCase() === (currentLocale ?? "").toLowerCase()) ??
    locales[0]

  const choose = (code: string) => {
    if (code.toLowerCase() === active?.code.toLowerCase()) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      await updateLocale(code)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div ref={boxRef} className="relative" data-testid="language-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="언어 선택"
        className="flex h-6 items-center gap-x-1 px-1 hover:text-ui-fg-base disabled:opacity-50"
        data-testid="language-switcher-button"
      >
        <span className="txt-compact-small">{shortCode(active?.code ?? "ko")}</span>
        <span aria-hidden="true" className="text-[10px] leading-none">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="언어 목록"
          className="absolute right-0 top-full z-[900] mt-1 min-w-[9rem] rounded-rounded border border-ui-border-base bg-white py-1 text-small-regular shadow-elevation-flyout"
          data-testid="language-switcher-list"
        >
          {locales.map((l) => {
            const isActive = l.code.toLowerCase() === active?.code.toLowerCase()
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => choose(l.code)}
                  className={
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-ui-bg-subtle " +
                    (isActive ? "text-ui-fg-base font-medium" : "text-ui-fg-subtle")
                  }
                  data-testid={`language-option-${l.code}`}
                >
                  <span>{nativeName(l.code, l.name)}</span>
                  {isActive && (
                    <span aria-hidden="true" className="ml-2">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

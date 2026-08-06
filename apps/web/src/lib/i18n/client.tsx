"use client"

/**
 * 클라이언트 컴포넌트용 번역 (2026-08-05 신설)
 *
 * ── 왜 provider 가 필요한가 ────────────────────────────────────────────────
 * 언어는 쿠키로 정해지는데 `next/headers` 는 서버 전용이다.
 * 그래서 레이아웃(서버)에서 언어를 읽어 provider 로 내려주고,
 * 클라이언트 컴포넌트는 그걸 읽어 쓴다.
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────────
 *   "use client"
 *   const t = useT()
 *   <button>{t("cart.checkout")}</button>
 *
 * provider 밖에서 호출해도 **터지지 않고 기본 언어(한국어)** 로 동작한다.
 * 화면 하나 때문에 앱 전체가 죽는 것보다 낫다.
 *
 * ⚠️ import 는 반드시 `./messages` 에서 — `./index` 는 `next/headers`(서버 전용)를
 *    끌고 오므로 클라이언트 번들에 섞이면 화면이 500 이 된다(2026-08-05 실제 발생).
 */
import { createContext, useContext, useMemo, type ReactNode } from "react"

import {
  DEFAULT_UI_LOCALE,
  makeT,
  type TFunction,
  type UiLocale,
} from "./messages"

const LocaleContext = createContext<UiLocale>(DEFAULT_UI_LOCALE)

export function I18nProvider({
  locale,
  children,
}: {
  locale: UiLocale
  children: ReactNode
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

/** 현재 UI 언어(클라이언트). */
export function useUiLocale(): UiLocale {
  return useContext(LocaleContext)
}

/** 클라이언트 컴포넌트에서 쓰는 번역 함수. */
export function useT(): TFunction {
  const locale = useContext(LocaleContext)
  return useMemo(() => makeT(locale), [locale])
}

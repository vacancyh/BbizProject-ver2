/**
 * 서버 컴포넌트용 번역 (2026-08-05 신설)
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────────
 *   const t = await getT()
 *   <button>{t("product.addToCart")}</button>
 *
 * 값 치환이 필요하면:
 *   t("store.resultCount", { count: 12 })   // "총 12개"
 *
 * ── 클라이언트 컴포넌트라면 ────────────────────────────────────────────────
 * `next/headers` 는 서버 전용이라 여기서 못 쓴다 → `@lib/i18n/client` 의 `useT()`.
 * 메시지는 레이아웃의 `<I18nProvider>` 가 내려준다.
 *
 * ⚠️ **이 파일을 클라이언트 컴포넌트에서 import 하지 말 것.**
 *    `next/headers` 가 클라이언트 번들에 끌려 들어가 화면이 500 이 된다(2026-08-05 실제 발생).
 *    서버·클라이언트가 함께 쓰는 것(interpolate·makeT)은 `./messages` 에 있다.
 */
import { cookies } from "next/headers"

import {
  DEFAULT_UI_LOCALE,
  UI_LOCALES,
  interpolate,
  makeT,
  toUiLocale,
  type MessageKey,
  type TFunction,
  type UiLocale,
} from "./messages"

/** 콘텐츠 번역과 **같은 쿠키**를 쓴다 — 언어 선택 한 번으로 둘 다 바뀐다. */
const LOCALE_COOKIE = "_medusa_locale"

/** 현재 UI 언어. 쿠키가 없거나 모르는 값이면 기본(한국어). */
export async function getUiLocale(): Promise<UiLocale> {
  try {
    const c = await cookies()
    return toUiLocale(c.get(LOCALE_COOKIE)?.value)
  } catch {
    // 요청 컨텍스트 밖(정적 생성 등) — 기본 언어로 렌더한다
    return DEFAULT_UI_LOCALE
  }
}

/** 서버 컴포넌트에서 쓰는 번역 함수. */
export async function getT(): Promise<TFunction> {
  return makeT(await getUiLocale())
}

export { UI_LOCALES, DEFAULT_UI_LOCALE, toUiLocale, interpolate, makeT }
export type { MessageKey, UiLocale, TFunction }

/**
 * 언어를 URL 에 담는 규칙 (2026-08-12 신설)
 *
 * ── 왜 URL 에 넣나 ──────────────────────────────────────────────────────────
 * 전에는 언어가 `_medusa_locale` 쿠키에만 있었다. 사람에게는 편했지만:
 *   · 검색엔진은 쿠키가 없다 → **영어 페이지를 아예 못 본다**(색인 불가)
 *   · 영어로 보다 링크를 공유하면 받는 사람은 한국어로 열린다
 *   · CDN 이 앞에 붙으면 한 언어로 만든 응답이 다른 언어 방문자에게 나갈 수 있다
 *
 * ── 규칙 ────────────────────────────────────────────────────────────────────
 *   /kr/store        → 한국어  (기본 언어는 접두사 없음)
 *   /en/kr/store     → 영어
 *
 * **URL 이 언어를 정한다.** 쿠키는 "마지막에 고른 언어"를 기억할 뿐이고,
 * 주소에 접두사가 있으면 그쪽이 이긴다 — 그래야 링크가 공유 가능해진다.
 *
 * 기본 언어에 접두사를 붙이지 않는 이유: 기존 주소(`/kr/...`)가 그대로 살아야
 * 이미 색인된 페이지와 공유된 링크가 깨지지 않는다.
 *
 * ⚠️ 이 파일은 **미들웨어(Edge)에서도 import 된다.** `next/headers` 같은
 *    Node 전용 모듈을 절대 들이지 말 것.
 */
import { DEFAULT_UI_LOCALE, UI_LOCALES, type UiLocale } from "./messages"

/** 주소에 접두사로 붙는 언어들 — 기본 언어(한국어)는 제외한다. */
export const PREFIXED_LOCALES = Object.keys(UI_LOCALES).filter(
  (l) => l !== DEFAULT_UI_LOCALE
) as UiLocale[]

/** 미들웨어가 앱에 언어를 알려 줄 때 쓰는 헤더. 쿠키보다 이게 우선이다. */
export const UI_LOCALE_HEADER = "x-ui-locale"

/** 미들웨어가 원래 주소를 알려 줄 때 쓰는 헤더(hreflang·canonical 생성용). */
export const PATHNAME_HEADER = "x-pathname"

/**
 * 주소 앞의 언어 접두사를 떼어낸다.
 *
 *   "/en/kr/store" → { locale: "en", pathname: "/kr/store" }
 *   "/kr/store"    → { locale: "ko", pathname: "/kr/store" }
 *
 * `/en` 처럼 접두사만 있는 경우도 `/` 로 정규화한다(뒤에서 국가코드를 붙인다).
 */
export function splitLocalePrefix(pathname: string): {
  locale: UiLocale
  pathname: string
} {
  const seg = pathname.split("/")[1]?.toLowerCase()
  if (seg && (PREFIXED_LOCALES as string[]).includes(seg)) {
    const rest = pathname.slice(seg.length + 1)
    return { locale: seg as UiLocale, pathname: rest || "/" }
  }
  return { locale: DEFAULT_UI_LOCALE, pathname }
}

/**
 * 주소에 언어 접두사를 붙인다. 기본 언어면 그대로 둔다.
 *
 *   ("en", "/kr/store") → "/en/kr/store"
 *   ("ko", "/kr/store") → "/kr/store"
 *
 * 이미 붙어 있으면 중복해서 붙이지 않는다.
 */
export function withLocalePrefix(locale: UiLocale, pathname: string): string {
  const { pathname: bare } = splitLocalePrefix(pathname)
  if (locale === DEFAULT_UI_LOCALE) return bare
  return `/${locale}${bare === "/" ? "" : bare}`
}

/**
 * 같은 화면의 다른 언어 주소.
 * 언어 전환기가 "지금 보고 있는 페이지 그대로 언어만 바꾸기"에 쓴다.
 */
export function localeAlternates(pathname: string): Record<UiLocale, string> {
  const out = {} as Record<UiLocale, string>
  for (const l of Object.keys(UI_LOCALES) as UiLocale[]) {
    out[l] = withLocalePrefix(l, pathname)
  }
  return out
}

/**
 * 콘텐츠 번역용 로케일 코드(BCP 47).
 * UI 언어("en")를 백엔드가 아는 형태("en-US")로 바꾼다.
 */
export const CONTENT_LOCALE: Record<UiLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
}

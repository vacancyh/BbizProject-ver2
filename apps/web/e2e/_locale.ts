/**
 * 테스트에서 언어를 지정하는 공용 헬퍼 (2026-08-12 신설)
 *
 * ── 왜 만들었나 ─────────────────────────────────────────────────────────────
 * 예전에는 각 스펙이 `_medusa_locale` 쿠키를 직접 심어 언어를 바꿨다.
 * 2026-08-12 부터 **주소가 언어를 정한다**(`/kr` = 한국어, `/en/kr` = 영어).
 * 쿠키를 심어도 `/kr/...` 은 한국어로 나온다 — 그래야 링크 공유가 성립하고
 * 검색엔진이 영어판을 볼 수 있다.
 *
 * 스펙마다 접두사를 손으로 붙이면 하나둘 빠뜨린다. 여기 한 곳에 모은다.
 */

/** 지원 언어 — 기본(한국어)은 접두사가 없다. */
export type TestLocale = "ko-KR" | "en-US"

/**
 * 언어에 맞는 주소를 만든다.
 *
 *   localized("/kr/store")            → "/kr/store"
 *   localized("/kr/store", "en-US")   → "/en/kr/store"
 *
 * 이미 접두사가 붙어 있으면 중복해서 붙이지 않는다.
 */
export function localized(path: string, locale?: TestLocale | null): string {
  const bare = path.replace(/^\/en(?=\/|$)/, "") || "/"
  if (!locale || locale === "ko-KR") return bare
  return `/en${bare === "/" ? "" : bare}`
}

/** `E2E_LOCALE` 환경변수로 언어를 골라 돌릴 때 쓴다(a11y·checkout 등). */
export function envLocale(): TestLocale | null {
  const v = process.env.E2E_LOCALE
  return v === "en-US" || v === "ko-KR" ? v : null
}

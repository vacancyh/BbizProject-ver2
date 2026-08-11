/**
 * 날짜 표기 — 화면 언어를 따라간다 (2026-08-10 신설)
 *
 * ── 왜 만들었나 ─────────────────────────────────────────────────────────────
 * 화면마다 `new Intl.DateTimeFormat("ko-KR", …)` 를 따로 들고 있어서,
 * 영어로 바꿔도 날짜만 **"2026년 7월 27일"** 로 남았다.
 * 버튼과 안내문은 전부 영어인데 그 옆에 한국어 날짜가 붙어 있으면 미완성으로 보인다.
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────────
 *   // 서버 컴포넌트
 *   const locale = await getUiLocale()
 *   formatDate(locale, order.created_at)
 *
 *   // 클라이언트 컴포넌트
 *   const locale = useUiLocale()
 *   formatDate(locale, coupon.expires_at)
 *
 * ⚠️ 여기에 `next/headers` 를 import 하지 말 것 — 클라이언트에서도 쓴다.
 */
import { DEFAULT_UI_LOCALE, type UiLocale } from "@lib/i18n/messages"

/** UI 언어("ko"/"en") → Intl 로케일 태그 */
export function intlLocale(locale: UiLocale | null | undefined): string {
  return (locale ?? DEFAULT_UI_LOCALE) === "en" ? "en-US" : "ko-KR"
}

/**
 * 기본 날짜 표기.
 *  ko → 2026. 07. 27.
 *  en → Jul 27, 2026
 *
 * 잘못된 값이 들어오면 빈 문자열을 준다 — "Invalid Date" 가 화면에 뜨는 것보다 낫다.
 */
export function formatDate(
  locale: UiLocale | null | undefined,
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value === null || value === undefined || value === "") return ""
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ""

  const opts: Intl.DateTimeFormatOptions =
    options ??
    (intlLocale(locale) === "en-US"
      ? { year: "numeric", month: "short", day: "numeric" }
      : { year: "numeric", month: "2-digit", day: "2-digit" })

  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d)
}

/** 날짜 + 시각 (주문 결제 시각 등). */
export function formatDateTime(
  locale: UiLocale | null | undefined,
  value: string | number | Date | null | undefined
): string {
  if (value === null || value === undefined || value === "") return ""
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

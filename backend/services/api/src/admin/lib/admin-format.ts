// 관리자 화면 공용 포맷 유틸. (ZIP 프로토타입의 money/fmt 를 정합 이식)
// 금액/숫자/증감률 표기를 한 곳에서 관리해 화면 간 표기를 통일합니다.

const nf = new Intl.NumberFormat("ko-KR")

/** 1234000 → "1,234,000원" (한국 원화, 단위 접미) */
export const krw = (n: number): string => `${nf.format(n)}원`

/** 1234000 → "₩1,234,000" (통화 기호 접두) */
export const won = (n: number): string => `₩${nf.format(n)}`

/** 1234 → "1,234" (천단위 콤마) */
export const fmt = (n: number): string => nf.format(n)

/** 8.2 → "+8.2%", -9.7 → "-9.7%" */
export const pct = (n: number): string => `${n > 0 ? "+" : ""}${n}%`

/**
 * 목록 필터 공용 상수 (2026-07-29)
 *
 * ⚠️ 이 파일에 "use client" 를 붙이지 말 것.
 * 클라이언트 모듈에서 상수를 export 하면 **서버 컴포넌트에서는 클라이언트 참조 프록시**로 들어와
 * `PRICE_RANGES.find is not a function` 같은 런타임 오류가 난다(실제로 겪음).
 * 서버·클라이언트 양쪽에서 쓰는 값은 이렇게 순수 모듈로 분리한다.
 */
export type FilterCategory = { id: string; name: string; handle: string }

/** 가격대 프리셋 — 국내 쇼핑몰에서 흔한 구간. 값은 원 단위. */
export const PRICE_RANGES: {
  key: string
  label: string
  min?: number
  max?: number
}[] = [
  { key: "all", label: "전체" },
  { key: "0-20000", label: "2만원 이하", max: 20000 },
  { key: "20000-40000", label: "2~4만원", min: 20000, max: 40000 },
  { key: "40000-60000", label: "4~6만원", min: 40000, max: 60000 },
  { key: "60000-", label: "6만원 이상", min: 60000 },
]

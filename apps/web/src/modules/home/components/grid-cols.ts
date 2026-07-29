/**
 * 상품 그리드 열 수 헬퍼 (2026-07-29)
 *
 * 항목이 4개 미만인 섹션에서 4열 고정을 쓰면 우측이 비어 어색하고,
 * auto-fit 을 쓰면 카드가 과도하게 커지거나(3개일 때) 줄이 5+3 으로 갈라졌다(8개일 때).
 * → **항목 수에 맞춰 열 수를 정하되 최대 4열**로 제한한다.
 *
 * Tailwind 는 동적 클래스명을 인식하지 못하므로 정적 매핑으로 둔다.
 */
const DESKTOP_COLS: Record<number, string> = {
  1: "small:grid-cols-1",
  2: "small:grid-cols-2",
  3: "small:grid-cols-3",
  4: "small:grid-cols-4",
}

export function productGridClass(count: number): string {
  const cols = Math.max(1, Math.min(count, 4))
  return `grid grid-cols-2 gap-x-4 gap-y-10 small:gap-y-12 ${DESKTOP_COLS[cols]}`
}

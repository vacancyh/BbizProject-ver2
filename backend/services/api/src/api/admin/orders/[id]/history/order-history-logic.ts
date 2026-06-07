/**
 * 주문 상태 전이 이력 순수 로직 (DB·req 의존 없음)
 *
 * serializeStateHistory: state-machine getHistory 결과를 화면 계약으로 정규화합니다.
 * - created_at 오름차순 정렬
 * - 빈 배열·null 안전 처리
 */

export interface StateHistoryItem {
  id: string
  from: string | null
  to: string | null
  actor: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

/**
 * getHistory 반환 rows 를 화면 계약(StateHistoryItem[]) 으로 정규화합니다.
 * - null / undefined rows → 빈 배열 반환
 * - created_at 오름차순 정렬 (이미 ASC 로 오지만 방어 정렬 포함)
 */
export function serializeStateHistory(rows: any[] | null | undefined): StateHistoryItem[] {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return []
  }

  const normalized: StateHistoryItem[] = rows.map((row) => ({
    id: row?.id ?? "",
    from: row?.from_state ?? row?.from ?? null,
    to: row?.to_state ?? row?.to ?? null,
    actor: row?.actor ?? null,
    metadata: row?.metadata ?? null,
    created_at: row?.created_at ?? null,
  }))

  // created_at 오름차순 정렬 (null 은 맨 뒤)
  normalized.sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0
    if (!a.created_at) return 1
    if (!b.created_at) return -1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return normalized
}

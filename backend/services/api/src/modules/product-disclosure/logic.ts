/**
 * 상품정보고시(ProductDisclosure) 순수 로직 — DB 무관.
 *
 *  - 상태 전이 검증: draft → published → archived 만 허용
 *  - 필수 항목 누락 검사: 고시 타입별 required 필드 검증
 *  - fields_json 직렬화/역직렬화: 안전 파싱
 */

export type DisclosureStatus = "draft" | "published" | "archived"

/**
 * 상태 전이 허용 여부.
 *  - draft      → published  : OK
 *  - published  → archived   : OK (새 버전 published 시 기존 자동 처리)
 *  - archived   → 어디든     : 불가(읽기 전용)
 *  - draft      → archived   : 불가(draft 는 반드시 published 경유)
 */
export function isValidStatusTransition(
  from: DisclosureStatus,
  to: DisclosureStatus
): boolean {
  if (from === to) return false
  if (from === "draft" && to === "published") return true
  if (from === "published" && to === "archived") return true
  return false
}

/**
 * 게시 가능 여부 — draft 상태만 게시 허용.
 */
export function isPublishable(status: DisclosureStatus): boolean {
  return status === "draft"
}

/**
 * 직접 수정 차단 여부 — published/archived 는 직접 편집 금지.
 */
export function isDirectEditBlocked(status: DisclosureStatus): boolean {
  return status === "published" || status === "archived"
}

/**
 * fields_json 안전 파싱.
 *  - 잘못된 JSON 이면 null 반환(오류 미전파).
 */
export function parseFieldsJson(raw: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, string>
  } catch {
    return null
  }
}

/**
 * 필수 항목 누락 검사.
 *  - requiredKeys: 고시 타입의 법정 필수 항목 키 목록 (ProductTypeDisclosureField 에서 주입)
 *  - fields: 실제 입력값 (parseFieldsJson 결과)
 *  - 반환: 누락된 key 목록(빈 배열 = 모두 입력)
 */
export function findMissingRequiredFields(
  requiredKeys: string[],
  fields: Record<string, string>
): string[] {
  return requiredKeys.filter((key) => {
    const value = fields[key]
    return value === undefined || value === null || String(value).trim() === ""
  })
}

/**
 * 고시 내용 변경 여부 판정.
 *  - 두 fields_json 문자열이 내용상 동일하면 false, 다르면 true.
 *  - 파싱 실패 시 항상 true(변경된 것으로 간주, 안전 측).
 */
export function isFieldsChanged(
  prevJson: string,
  nextJson: string
): boolean {
  const prev = parseFieldsJson(prevJson)
  const next = parseFieldsJson(nextJson)
  if (!prev || !next) return true
  return JSON.stringify(Object.keys(prev).sort().map((k) => [k, prev[k]])) !==
    JSON.stringify(Object.keys(next).sort().map((k) => [k, next[k]]))
}

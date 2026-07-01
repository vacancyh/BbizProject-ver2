/**
 * 사용자 입력 텍스트 검증 유틸 — 최소/최대 길이 상한(과대 payload·남용 방지).
 * 반환: 에러 메시지(문자열) 또는 null(통과).
 */
export function checkText(
  value: unknown,
  opts: { field: string; min?: number; max: number; required?: boolean }
): string | null {
  const s = String(value ?? "").trim()
  if (opts.required && s.length === 0) {
    return `${opts.field}은(는) 필수입니다.`
  }
  if (opts.min && s.length > 0 && s.length < opts.min) {
    return `${opts.field}은(는) ${opts.min}자 이상이어야 합니다.`
  }
  if (s.length > opts.max) {
    return `${opts.field}은(는) ${opts.max}자를 초과할 수 없습니다.`
  }
  return null
}

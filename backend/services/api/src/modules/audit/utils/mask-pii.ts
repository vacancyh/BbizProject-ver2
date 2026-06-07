/**
 * PII 마스킹 유틸 — 감사 로그 저장 전 개인정보 마스킹.
 *
 * 대상(관리자_설계.md §5.2 PII 마스킹 요구):
 *  - 휴대폰/전화번호  → 가운데 자리 마스킹 (010-1234-5678 → 010-****-5678)
 *  - 주민등록번호     → 뒷자리 마스킹       (901010-1234567 → 901010-1******)
 *  - 이메일           → 로컬파트 일부 마스킹 (hong@x.com → ho**@x.com)
 *  - 비밀번호/토큰 키 → 전체 마스킹         (password/token/secret 등)
 *
 * 문자열·객체·배열을 재귀적으로 순회하여 마스킹한 사본을 반환한다(원본 불변).
 */

const PHONE_RE = /(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/g
const RRN_RE = /(\d{6})[-\s]?([1-4])\d{6}/g
const EMAIL_RE = /([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*)(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

// 키 이름만으로 전체 마스킹할 민감 필드
const SECRET_KEYS = ["password", "token", "secret", "api_key", "apikey", "authorization"]

/** 문자열 1건 마스킹 */
export function maskString(input: string): string {
  let out = input
  out = out.replace(RRN_RE, (_m, front) => `${front}-${"*".repeat(7)}`)
  out = out.replace(PHONE_RE, (_m, a, _b, c) => `${a}-****-${c}`)
  out = out.replace(EMAIL_RE, (_m, first, _rest, domain) => `${first}**${domain}`)
  return out
}

/** 값(문자열/객체/배열) 재귀 마스킹. 객체 키가 민감 키면 전체 마스킹. */
export function maskPii<T>(value: T): T {
  if (value == null) return value
  if (typeof value === "string") {
    return maskString(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => maskPii(v)) as unknown as T
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.includes(k.toLowerCase())) {
        out[k] = "********"
      } else {
        out[k] = maskPii(v)
      }
    }
    return out as unknown as T
  }
  return value
}

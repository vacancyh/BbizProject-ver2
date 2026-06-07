/**
 * 동의 이력 순수 로직 모듈 (백엔드 정본) — DB 의존 없음. (d5 t008 갭B)
 *
 * ★ 단일 진실(§V0): 동일 룰이 admin 앱(apps/admin/src/lib/members/consent-logic.ts)에도 존재.
 *   책임 레이어 분리(admin=화면, backend=영속 권위). shared 통합은 별도 deferred.
 *
 * 최신 동의 판정 + 2년 재확인 도래 판정. 동의이력은 append-only(service).
 */

/** 동의 채널 */
export type ConsentChannel = "marketing" | "terms" | "privacy" | "sms" | "email"

/** 동의 기록 (append-only) */
export type ConsentRecord = {
  channel: ConsentChannel
  agreed: boolean
  recordedAt: string // ISO
}

/** 재확인 주기(기본 2년) */
export const RECONSENT_YEARS = 2

/** 모든 동의 채널(상태 조회 기본 집합) */
export const ALL_CONSENT_CHANNELS: ConsentChannel[] = [
  "marketing",
  "terms",
  "privacy",
  "sms",
  "email",
]

/** 특정 채널의 최신 동의 기록 반환(없으면 null). */
export function getLatestConsent(
  records: ConsentRecord[],
  channel: ConsentChannel
): ConsentRecord | null {
  const filtered = records
    .filter((r) => r.channel === channel)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
  return filtered[0] ?? null
}

/** 현재 채널 동의 상태(최신 기록의 agreed). 기록 없으면 false. */
export function isConsented(records: ConsentRecord[], channel: ConsentChannel): boolean {
  return getLatestConsent(records, channel)?.agreed ?? false
}

/** 재확인 도래 여부 — 최신 동의 시점이 N년 경과면 true (2년 재확인). */
export function isReconsentDue(
  recordedAtIso: string,
  nowIso: string,
  years = RECONSENT_YEARS
): boolean {
  const recorded = new Date(recordedAtIso)
  const now = new Date(nowIso)
  if (isNaN(recorded.getTime()) || isNaN(now.getTime())) throw new Error("일자 형식 오류")
  const due = new Date(recorded)
  due.setFullYear(due.getFullYear() + years)
  return now.getTime() >= due.getTime()
}

/** 고객의 재확인 필요 채널 추출 — 동의(agreed=true) 중 N년 경과 채널. */
export function channelsNeedingReconsent(
  records: ConsentRecord[],
  channels: ConsentChannel[],
  nowIso: string,
  years = RECONSENT_YEARS
): ConsentChannel[] {
  const result: ConsentChannel[] = []
  for (const ch of channels) {
    const latest = getLatestConsent(records, ch)
    if (latest && latest.agreed && isReconsentDue(latest.recordedAt, nowIso, years)) {
      result.push(ch)
    }
  }
  return result
}

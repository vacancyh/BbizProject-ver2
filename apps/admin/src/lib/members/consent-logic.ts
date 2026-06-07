/**
 * 동의 이력 순수 로직 모듈 (d5 t008_동의이력 spec §9 — 갭B)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - 백엔드 영속화(consent_log append-only 모델·route·재확인 추출 job)는 갭B 신규 모듈 영역으로 deferred.
 *   본 모듈은 최신 동의 판정 + 2년 재확인 도래 판정 룰만 제공.
 */

/** 동의 채널 */
export type ConsentChannel = "marketing" | "terms" | "privacy" | "sms" | "email";

/** 동의 기록 (append-only) */
export type ConsentRecord = {
  channel: ConsentChannel;
  agreed: boolean;
  recordedAt: string; // ISO
};

/** 재확인 주기(기본 2년) */
export const RECONSENT_YEARS = 2;

/** 특정 채널의 최신 동의 기록 반환(없으면 null). */
export function getLatestConsent(
  records: ConsentRecord[],
  channel: ConsentChannel
): ConsentRecord | null {
  const filtered = records
    .filter((r) => r.channel === channel)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  return filtered[0] ?? null;
}

/** 현재 채널 동의 상태(최신 기록의 agreed). 기록 없으면 false. */
export function isConsented(records: ConsentRecord[], channel: ConsentChannel): boolean {
  return getLatestConsent(records, channel)?.agreed ?? false;
}

/**
 * 재확인 도래 여부 — 최신 동의 시점이 N년 경과면 true (2년 재확인).
 * @param years 재확인 주기(기본 2년)
 */
export function isReconsentDue(
  recordedAtIso: string,
  nowIso: string,
  years = RECONSENT_YEARS
): boolean {
  const recorded = new Date(recordedAtIso);
  const now = new Date(nowIso);
  if (isNaN(recorded.getTime()) || isNaN(now.getTime())) throw new Error("일자 형식 오류");
  const due = new Date(recorded);
  due.setFullYear(due.getFullYear() + years);
  return now.getTime() >= due.getTime();
}

/**
 * 고객의 재확인 필요 채널 추출 — 동의(agreed=true) 중 N년 경과 채널.
 */
export function channelsNeedingReconsent(
  records: ConsentRecord[],
  channels: ConsentChannel[],
  nowIso: string,
  years = RECONSENT_YEARS
): ConsentChannel[] {
  const result: ConsentChannel[] = [];
  for (const ch of channels) {
    const latest = getLatestConsent(records, ch);
    if (latest && latest.agreed && isReconsentDue(latest.recordedAt, nowIso, years)) {
      result.push(ch);
    }
  }
  return result;
}

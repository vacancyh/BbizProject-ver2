/**
 * 휴면계정 판정(순수 로직).
 *  - dormant: 마지막 활동 이후 dormantDays(기본 365) 경과 → 휴면 대상
 *  - atRisk : warnDays(기본 335, 휴면 30일 전) 경과 → 사전 안내 대상
 * 개인정보보호법 유효기간(기본 1년) 기준. 임계값은 정책으로 조정.
 */
export type Activity = { customer_id: string; last_active_at: string | Date }

export function classifyDormancy(
  activities: Activity[],
  now: number,
  dormantDays = 365,
  warnDays = 335
): { dormant: string[]; atRisk: string[] } {
  const dormantMs = dormantDays * 86400_000
  const warnMs = warnDays * 86400_000
  const dormant: string[] = []
  const atRisk: string[] = []
  for (const a of activities) {
    const t =
      a.last_active_at instanceof Date
        ? a.last_active_at.getTime()
        : new Date(a.last_active_at).getTime()
    if (!Number.isFinite(t)) continue
    const idle = now - t
    if (idle >= dormantMs) dormant.push(a.customer_id)
    else if (idle >= warnMs) atRisk.push(a.customer_id)
  }
  return { dormant, atRisk }
}

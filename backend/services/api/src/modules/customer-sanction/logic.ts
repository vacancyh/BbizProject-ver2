/**
 * 제재·블랙리스트 순수 로직 모듈 (백엔드 정본) — DB 의존 없음. (d5 t006 갭B)
 *
 * ★ 단일 진실(§V0): 동일 룰이 admin 앱(apps/admin/src/lib/members/sanction-logic.ts)에도 존재.
 *   책임 레이어 분리(admin=화면, backend=영속 권위). shared 통합은 별도 deferred.
 *
 * 단계: 경고(warn) → 7일(seven_days) → 30일(thirty_days) → 영구(permanent)
 */

/** 제재 단계 (순서 고정) */
export const SANCTION_LEVELS = ["warn", "seven_days", "thirty_days", "permanent"] as const
export type SanctionLevel = (typeof SANCTION_LEVELS)[number]

/** 단계별 차단 기간(일). 경고=0, 영구=null(무기한) */
export function sanctionDurationDays(level: SanctionLevel): number | null {
  switch (level) {
    case "warn":
      return 0
    case "seven_days":
      return 7
    case "thirty_days":
      return 30
    case "permanent":
      return null
  }
}

/** 다음 단계 전이 (경고→7→30→영구, 영구에서 더 못 올라감). */
export function getNextSanctionLevel(current: SanctionLevel): SanctionLevel {
  const idx = SANCTION_LEVELS.indexOf(current)
  if (idx < 0) throw new Error(`알 수 없는 제재 단계: ${current}`)
  if (idx >= SANCTION_LEVELS.length - 1) return "permanent"
  return SANCTION_LEVELS[idx + 1]
}

/** 제재 만료일 계산 — startAt + durationDays. 영구는 null. */
export function calcSanctionUntil(level: SanctionLevel, startAtIso: string): string | null {
  const days = sanctionDurationDays(level)
  if (days === null) return null // 영구
  if (days === 0) return startAtIso // 경고(즉시 종료, 기록만)
  const base = new Date(startAtIso)
  if (isNaN(base.getTime())) throw new Error("시작일자 형식 오류")
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * 제재 활성 여부 — 영구는 항상 활성, 기간제는 untilAt 이전이면 활성.
 * 경고(untilAt==startAt)는 기록성으로 비활성 취급.
 */
export function isSanctionActive(
  level: SanctionLevel,
  untilAtIso: string | null,
  nowIso: string
): boolean {
  if (level === "permanent") return true
  if (level === "warn") return false // 경고는 차단 아님(기록)
  if (!untilAtIso) return false
  const until = new Date(untilAtIso).getTime()
  const now = new Date(nowIso).getTime()
  if (isNaN(until) || isNaN(now)) throw new Error("일자 형식 오류")
  return now < until
}

/** 로그인 차단 판정 — 활성 제재 중 차단 단계(7/30/영구)면 차단. */
export function shouldBlockLogin(
  level: SanctionLevel,
  untilAtIso: string | null,
  nowIso: string
): boolean {
  return level !== "warn" && isSanctionActive(level, untilAtIso, nowIso)
}

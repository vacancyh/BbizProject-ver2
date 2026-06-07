/**
 * 제재·블랙리스트 순수 로직 모듈 (d5 t006_제재블랙리스트 spec §9 — 갭B 비즈니스 룰)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - 백엔드 영속화(sanction 모델·route·진행중 주문 강제취소 연동)는 갭B 신규 모듈 영역으로 deferred.
 *   본 모듈은 단계 전이 + 활성 판정 + 로그인 차단 판정 룰만 제공.
 *
 * 단계(스펙 명시): 경고(warn) → 7일(seven_days) → 30일(thirty_days) → 영구(permanent)
 */

/** 제재 단계 (순서 고정) */
export const SANCTION_LEVELS = ["warn", "seven_days", "thirty_days", "permanent"] as const;
export type SanctionLevel = (typeof SANCTION_LEVELS)[number];

/** 단계별 차단 기간(일). 경고=0, 영구=null(무기한) */
export function sanctionDurationDays(level: SanctionLevel): number | null {
  switch (level) {
    case "warn":
      return 0;
    case "seven_days":
      return 7;
    case "thirty_days":
      return 30;
    case "permanent":
      return null;
  }
}

/** 다음 단계 전이 (경고→7→30→영구, 영구에서 더 못 올라감). */
export function getNextSanctionLevel(current: SanctionLevel): SanctionLevel {
  const idx = SANCTION_LEVELS.indexOf(current);
  if (idx < 0) throw new Error(`알 수 없는 제재 단계: ${current}`);
  if (idx >= SANCTION_LEVELS.length - 1) return "permanent";
  return SANCTION_LEVELS[idx + 1];
}

/**
 * 제재 만료일 계산 — startAt + durationDays. 영구는 null.
 */
export function calcSanctionUntil(level: SanctionLevel, startAtIso: string): string | null {
  const days = sanctionDurationDays(level);
  if (days === null) return null; // 영구
  if (days === 0) return startAtIso; // 경고(즉시 종료, 기록만)
  const base = new Date(startAtIso);
  if (isNaN(base.getTime())) throw new Error("시작일자 형식 오류");
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
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
  if (level === "permanent") return true;
  if (level === "warn") return false; // 경고는 차단 아님(기록)
  if (!untilAtIso) return false;
  const until = new Date(untilAtIso).getTime();
  const now = new Date(nowIso).getTime();
  if (isNaN(until) || isNaN(now)) throw new Error("일자 형식 오류");
  return now < until;
}

/** 로그인 차단 판정 — 활성 제재 중 차단 단계(7/30/영구)면 차단. */
export function shouldBlockLogin(
  level: SanctionLevel,
  untilAtIso: string | null,
  nowIso: string
): boolean {
  return level !== "warn" && isSanctionActive(level, untilAtIso, nowIso);
}

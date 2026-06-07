/**
 * 포인트 순수 로직 모듈 (d5 t005_포인트 spec §9 — 갭B 비즈니스 룰)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - 백엔드 영속화(point_ledger append-only / point_balance CHECK≥0 / 구독자 / 소멸 cron / D-N 알림)는
 *   갭B 신규 모듈 영역으로 deferred. 본 모듈은 적립/사용/소멸/잔액 계산 룰만 제공.
 *
 * UT: 적립(가입/구매/리뷰/추천/출석) 계산 · 사용(잔액 검증) · 소멸(유효기간) · 잔액 부분합.
 */

/** 포인트 적립 사유 */
export type PointReason = "signup" | "purchase" | "review" | "referral" | "attendance";

/** 원장 항목 (append-only) — 양수=적립, 음수=사용/소멸 */
export type PointLedgerEntry = {
  type: "earn" | "redeem" | "expire";
  amount: number; // earn 양수, redeem/expire 음수 기대
  expiresAt?: string | null; // earn 항목의 유효기간(ISO)
};

/** 구매금액 × 적립률(%) → 적립 포인트(내림). */
export function calcPointsEarn(amount: number, ratePercent: number): number {
  if (amount < 0) throw new Error("구매금액은 0 이상이어야 합니다");
  if (!(ratePercent >= 0 && ratePercent <= 100)) throw new Error("적립률은 0~100% 여야 합니다");
  return Math.floor((amount * ratePercent) / 100);
}

/** 유효기간 만료일 계산 — 적립일 + validDays. */
export function calcExpiryDate(earnedAtIso: string, validDays: number): string {
  if (validDays <= 0) throw new Error("유효기간(일)은 1 이상이어야 합니다");
  const base = new Date(earnedAtIso);
  if (isNaN(base.getTime())) throw new Error("적립일자 형식 오류");
  const expiry = new Date(base.getTime() + validDays * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

/** 만료 여부 — now 기준 expiry 도래. */
export function isPointExpired(expiryIso: string, nowIso: string): boolean {
  const exp = new Date(expiryIso).getTime();
  const now = new Date(nowIso).getTime();
  if (isNaN(exp) || isNaN(now)) throw new Error("일자 형식 오류");
  return now >= exp;
}

/** 소멸 임박 D-N 일 이내 여부 (D-N 알림 대상 판정). 만료 후면 false. */
export function isExpiringWithin(expiryIso: string, nowIso: string, days: number): boolean {
  const exp = new Date(expiryIso).getTime();
  const now = new Date(nowIso).getTime();
  if (isNaN(exp) || isNaN(now)) throw new Error("일자 형식 오류");
  if (now >= exp) return false; // 이미 만료
  const remainMs = exp - now;
  return remainMs <= days * 24 * 60 * 60 * 1000;
}

/** 원장 부분합 → 현재 잔액 (음수 방지: 0 바닥). */
export function calcBalanceFromLedger(entries: PointLedgerEntry[]): number {
  const sum = entries.reduce((acc, e) => acc + e.amount, 0);
  return Math.max(0, sum);
}

export type RedeemValidation =
  | { ok: true; nextBalance: number }
  | { ok: false; reason: string };

/** 사용 가능 검증 — 잔액 이내 + 양수. */
export function canRedeemPoints(balance: number, useAmount: number): RedeemValidation {
  if (!Number.isInteger(useAmount) || useAmount <= 0) {
    return { ok: false, reason: "사용 포인트는 1 이상의 정수여야 합니다" };
  }
  if (useAmount > balance) {
    return { ok: false, reason: `잔액(${balance}) 초과 사용 불가` };
  }
  return { ok: true, nextBalance: balance - useAmount };
}

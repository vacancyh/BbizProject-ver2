/**
 * 회원 d5 갭B 모듈 API 클라이언트 — membership/point/sanction 백엔드 route 호출.
 *
 * 백엔드: src/api/admin/{membership,points,sanctions}/customers/:id
 * 정책(등급구간·적립유효기간)은 policy 모듈 주입 — 본 클라이언트는 조회/조작만.
 */
import { apiFetch } from "./client";

/* ── 멤버십 등급 ── */
export type Tier = { name: string; minAmount: number; earnRate: number };
export type MembershipSnapshot = {
  customer_id: string;
  accrued_amount: number;
  current_tier: string;
  last_change_reason: string | null;
};
export type MembershipView = {
  membership: MembershipSnapshot;
  next_tier: { name: string; remaining: number } | null;
  tiers: Tier[];
};

/** 고객 멤버십 등급 조회. */
export async function getMembership(customerId: string): Promise<MembershipView> {
  return apiFetch<MembershipView>(`/admin/membership/customers/${customerId}`);
}

/** 누적/환불 반영(수동). */
export async function recordAccrual(
  customerId: string,
  amount: number,
  type: "accrual" | "refund" = "accrual"
): Promise<{ membership: MembershipSnapshot; applied: string }> {
  return apiFetch(`/admin/membership/customers/${customerId}/accrual`, {
    method: "POST",
    body: JSON.stringify({ amount, type }),
  });
}

/* ── 포인트 ── */
export type PointLedgerRow = {
  id: string;
  entry_type: "earn" | "redeem" | "expire";
  amount: number;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
};
export type PointsView = {
  customer_id: string;
  balance: number;
  ledger: PointLedgerRow[];
  expiring_soon: PointLedgerRow[];
};

/** 고객 포인트 잔액+원장 조회. */
export async function getPoints(customerId: string): Promise<PointsView> {
  return apiFetch<PointsView>(`/admin/points/customers/${customerId}`);
}

/** 포인트 적립. */
export async function earnPoints(
  customerId: string,
  points: number,
  reason?: string
): Promise<{ balance: number }> {
  return apiFetch(`/admin/points/customers/${customerId}/earn`, {
    method: "POST",
    body: JSON.stringify({ points, reason }),
  });
}

/** 포인트 사용. */
export async function redeemPoints(
  customerId: string,
  useAmount: number
): Promise<{ balance: number }> {
  return apiFetch(`/admin/points/customers/${customerId}/redeem`, {
    method: "POST",
    body: JSON.stringify({ useAmount }),
  });
}

/* ── 제재 ── */
export type SanctionStatus = {
  customer_id: string;
  level: "warn" | "seven_days" | "thirty_days" | "permanent" | null;
  until_at: string | null;
  active: boolean;
  is_active_sanction: boolean;
  login_blocked: boolean;
};
export type SanctionView = { sanction: SanctionStatus };

/** 고객 제재 상태 조회. */
export async function getSanction(customerId: string): Promise<SanctionView> {
  return apiFetch<SanctionView>(`/admin/sanctions/customers/${customerId}`);
}

/** 제재 단계 상승. */
export async function applySanction(
  customerId: string,
  reason: string
): Promise<SanctionView> {
  return apiFetch(`/admin/sanctions/customers/${customerId}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/** 제재 해제. */
export async function liftSanction(customerId: string): Promise<{ lifted: boolean }> {
  return apiFetch(`/admin/sanctions/customers/${customerId}`, { method: "DELETE" });
}

/* ── 드로어 통합 뷰 ── */
export type MemberD5 = {
  membership: MembershipView | null;
  points: PointsView | null;
  sanction: SanctionStatus | null;
};

/** 회원 상세 드로어용 d5 데이터 일괄 조회(개별 실패 허용). */
export async function getMemberD5(customerId: string): Promise<MemberD5> {
  const [m, p, s] = await Promise.allSettled([
    getMembership(customerId),
    getPoints(customerId),
    getSanction(customerId),
  ]);
  return {
    membership: m.status === "fulfilled" ? m.value : null,
    points: p.status === "fulfilled" ? p.value : null,
    sanction: s.status === "fulfilled" ? s.value.sanction : null,
  };
}

/** 제재 단계 한글 라벨. */
export const SANCTION_LABEL: Record<string, string> = {
  warn: "경고",
  seven_days: "7일 정지",
  thirty_days: "30일 정지",
  permanent: "영구 정지",
};

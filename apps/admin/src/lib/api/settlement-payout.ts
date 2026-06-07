/**
 * 정산 지급(payout) API 클라이언트 — settlement-payout 갭B 백엔드 모듈 호출/래핑.
 *
 * 백엔드: src/api/admin/settlement/periods(/:key, /:key/close, /:key/pay)
 * 기간(period_key, 예 "2026-05")당 1행. 집계 스냅샷(gross/refund/pg_fee/net) + 상태머신(open→closed→paid).
 * Medusa core 미수정 — 집계는 settlement.ts(주문 결제 기반)에서 산출, 본 클라이언트는 스냅샷 저장/상태 전이만.
 */
import { apiFetch } from "./client";

/** 정산 기간 1행(백엔드 settlement_payout 모델 정합). */
export type SettlementPeriod = {
  id: string;
  period_key: string;       // "2026-05"
  gross_amount: number;     // 매출(캡처액, 원)
  refund_amount: number;    // 환불액(원)
  pg_fee: number;           // PG 수수료(원)
  net_amount: number;       // 순정산액 = gross - refund - pg_fee
  status: "open" | "closed" | "paid";
  closed_at: string | null;
  paid_at: string | null;
  memo: string | null;
};

/** 스냅샷 upsert 입력. pgFee 미지정 시 정책(settlement.pg_fee_rate)×gross 자동계산. */
export type SnapshotInput = {
  gross: number;
  refund: number;
  pgFee?: number;
  memo?: string;
};

/** 정산 기간 목록(최신순). */
export function listPeriods(): Promise<{ periods: SettlementPeriod[]; count: number }> {
  return apiFetch(`/admin/settlement/periods`);
}

/** 정산 기간 1건 조회(없으면 404 → throw). */
export function getPeriod(periodKey: string): Promise<{ period: SettlementPeriod }> {
  return apiFetch(`/admin/settlement/periods/${encodeURIComponent(periodKey)}`);
}

/** 집계 스냅샷 upsert(상태 open). */
export function upsertSnapshot(
  periodKey: string,
  input: SnapshotInput
): Promise<{ period: SettlementPeriod }> {
  return apiFetch(`/admin/settlement/periods/${encodeURIComponent(periodKey)}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 마감: open → closed. */
export function closePeriod(periodKey: string): Promise<{ period: SettlementPeriod }> {
  return apiFetch(`/admin/settlement/periods/${encodeURIComponent(periodKey)}/close`, {
    method: "POST",
  });
}

/** 지급완료: closed → paid. */
export function payPeriod(periodKey: string): Promise<{ period: SettlementPeriod }> {
  return apiFetch(`/admin/settlement/periods/${encodeURIComponent(periodKey)}/pay`, {
    method: "POST",
  });
}

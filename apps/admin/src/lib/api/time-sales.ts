/**
 * 타임세일(Time Sale) API 호출 레이어 — 커스텀 time-sale 모듈의 Admin REST(/admin/time-sales) 호출/래핑(로직 복사 X).
 *  - 목록:  GET    /admin/time-sales?product_id=&status=&limit=&offset=  → { time_sales, count, limit, offset }
 *  - 생성:  POST   /admin/time-sales                                     → { time_sale } (검증 실패 시 400)
 *  - 단건:  GET    /admin/time-sales/:id                                 → { time_sale } (없으면 404)
 *  - 종료:  DELETE /admin/time-sales/:id                                 → { time_sale, ended }
 *
 * 상태/할인 정책은 모두 백엔드(modules/time-sale/logic·service)에서 판정·계산한다(리플랫폼 원칙: FE 재구현 금지).
 * 백엔드 모델 필드: product_id, title, discount_type(percent|fixed), discount_value,
 *                  original_price(nullable), starts_at(ISO), ends_at(ISO), status(scheduled|active|ended).
 */
import { apiFetch } from "./client";

/** 세일 상태 — 백엔드 modules/time-sale/logic.SaleStatus 와 동일. */
export type SaleStatus = "scheduled" | "active" | "ended";

/** 할인 유형 — 백엔드 modules/time-sale/logic.DiscountType 와 동일. */
export type DiscountType = "percent" | "fixed";

/** 타임세일 단건(백엔드 service.toView 정규화 결과). */
export type TimeSale = {
  id: string;
  product_id: string;
  title: string;
  discount_type: DiscountType;
  discount_value: number;
  /** 원가 스냅샷(없으면 null) — 종료 시 원가 복원 기준. */
  original_price: number | null;
  starts_at: string;
  ends_at: string;
  status: SaleStatus;
  created_at?: string;
  updated_at?: string;
};

export type ListTimeSalesParams = {
  product_id?: string;
  status?: SaleStatus;
  limit?: number;
  offset?: number;
};

/** 타임세일 목록 조회. */
export function listTimeSales(
  params: ListTimeSalesParams = {}
): Promise<{ time_sales: TimeSale[]; count: number; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  if (params.product_id) qs.set("product_id", params.product_id);
  if (params.status) qs.set("status", params.status);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/time-sales?${qs.toString()}`);
}

export type CreateTimeSaleInput = {
  product_id: string;
  title: string;
  discount_type: DiscountType;
  discount_value: number;
  /** 원가 스냅샷(선택) — 입력 시 종료 후 원가 복원 대상이 된다. */
  original_price?: number | null;
  starts_at: string;
  ends_at: string;
};

/** 타임세일 생성(검증·상태 산정은 백엔드 담당, 검증 실패 시 400). */
export function createTimeSale(input: CreateTimeSaleInput): Promise<{ time_sale: TimeSale }> {
  return apiFetch(`/admin/time-sales`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 타임세일 단건 조회(없으면 404). */
export function getTimeSale(id: string): Promise<{ time_sale: TimeSale }> {
  return apiFetch(`/admin/time-sales/${id}`);
}

/** 타임세일 강제 종료(status="ended"). 종료 시 원가 복원은 백엔드 job/service 담당. */
export function endTimeSale(id: string): Promise<{ time_sale: TimeSale; ended: boolean }> {
  return apiFetch(`/admin/time-sales/${id}`, { method: "DELETE" });
}

/* ───────── 표시 헬퍼(순수 표시용 — 정책 판정 아님) ───────── */

/** 상태 → 한글 라벨 + badge 클래스. */
export const SALE_STATUS_BADGE: Record<SaleStatus, { label: string; cls: string }> = {
  scheduled: { label: "예정", cls: "info" },
  active: { label: "진행중", cls: "success" },
  ended: { label: "종료", cls: "neutral" },
};

/** 할인 표기 — percent 는 "%", fixed 는 통화 차감 텍스트(표시 전용). */
export function discountText(s: Pick<TimeSale, "discount_type" | "discount_value">): string {
  if (s.discount_type === "percent") return `${s.discount_value}%`;
  return `-${s.discount_value.toLocaleString("ko-KR")}원`;
}

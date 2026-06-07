/**
 * 쿠폰·프로모션 API 호출 레이어 — Medusa REST /admin/promotions 호출/래핑(로직 복사 X).
 *  - 상품 연계 = application_method.target_type "items" + target_rules(items.product.id 등).
 *  - 주문 연계 = target_type "order"(주문 전체 할인) + rules(주문 조건: 회원그룹/통화 등).
 * 통화 하드코딩 금지(currency_code). 할인 로직은 Medusa 코어가 계산(우리는 정의만 전달).
 */
import { apiFetch } from "./client";

export type PromotionStatus = "active" | "inactive" | "draft";
export type DiscountType = "percentage" | "fixed";
/** 적용 대상 — 주문 전체 / 특정 상품 / 카테고리 / 컬렉션 */
export type PromoScope = "order" | "products" | "categories" | "collection";

export type PromoRule = {
  id?: string;
  attribute: string;
  operator: string;
  values: { value: string }[] | string[];
};

export type ApplicationMethod = {
  id?: string;
  type: DiscountType;
  target_type: "order" | "items" | "shipping_methods";
  value: number;
  currency_code: string | null;
  allocation: "each" | "across" | null;
  max_quantity: number | null;
  target_rules?: PromoRule[];
};

export type Promotion = {
  id: string;
  code: string;
  type: "standard" | "buyget";
  status: PromotionStatus;
  is_automatic: boolean;
  limit?: number | null;
  used?: number;
  application_method?: ApplicationMethod;
  rules?: PromoRule[];
  campaign_id?: string | null;
};

const LIST_FIELDS =
  "id,code,type,status,is_automatic,application_method.type,application_method.target_type,application_method.value,application_method.currency_code";
const DETAIL_FIELDS =
  "id,code,type,status,is_automatic,campaign_id," +
  "application_method.id,application_method.type,application_method.target_type,application_method.value,application_method.currency_code,application_method.allocation,application_method.max_quantity," +
  "application_method.target_rules.id,application_method.target_rules.attribute,application_method.target_rules.operator,application_method.target_rules.values.value," +
  "rules.id,rules.attribute,rules.operator,rules.values.value";

/** 프로모션 목록. */
export function listPromotions(params: { q?: string; limit?: number; offset?: number } = {}): Promise<{
  promotions: Promotion[];
  count: number;
}> {
  const qs = new URLSearchParams({ fields: LIST_FIELDS, order: "-created_at" });
  if (params.q) qs.set("q", params.q);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/promotions?${qs.toString()}`);
}

/** 프로모션 상세(할인·상품 연계 타겟·주문 조건). */
export function getPromotion(id: string): Promise<{ promotion: Promotion }> {
  const qs = new URLSearchParams({ fields: DETAIL_FIELDS });
  return apiFetch(`/admin/promotions/${id}?${qs.toString()}`);
}

/** 적용 대상(scope) → Medusa target_type + target_rules attribute 매핑. */
const SCOPE_ATTR: Record<Exclude<PromoScope, "order">, string> = {
  products: "items.product.id",
  categories: "items.product.categories.id",
  collection: "items.product.collection_id",
};

export type CreatePromotionInput = {
  code: string;
  is_automatic: boolean;
  status: PromotionStatus;
  discountType: DiscountType;
  value: number;
  currency_code?: string; // fixed 일 때 필수
  scope: PromoScope;
  targetIds?: string[]; // products/categories/collection 일 때
  maxQuantity?: number; // items 각각 적용 시 최대 수량
  /** 주문 조건(주문 연계) — 회원그룹/통화 등. */
  orderRules?: { attribute: string; operator: string; values: string[] }[];
};

/** 프로모션 생성 — 상품 연계/주문 연계를 한 번에 구성. */
export function createPromotion(input: CreatePromotionInput): Promise<{ promotion: Promotion }> {
  const isItems = input.scope !== "order";
  // 수량 제한(maxQuantity) 지정 시 each(단위별·최대수량 필수), 미지정 시 across(매칭 상품 전체 분배).
  const useEach = isItems && !!input.maxQuantity;
  const am: Record<string, unknown> = {
    type: input.discountType,
    target_type: isItems ? "items" : "order",
    value: input.value,
    allocation: isItems ? (useEach ? "each" : "across") : "across",
  };
  if (input.discountType === "fixed") am.currency_code = input.currency_code ?? "krw";
  if (isItems) {
    if (useEach) am.max_quantity = input.maxQuantity;
    am.target_rules = [
      {
        attribute: SCOPE_ATTR[input.scope as Exclude<PromoScope, "order">],
        operator: "in",
        values: input.targetIds ?? [],
      },
    ];
  }
  const body: Record<string, unknown> = {
    code: input.code,
    type: "standard",
    is_automatic: input.is_automatic,
    status: input.status,
    application_method: am,
  };
  if (input.orderRules?.length) {
    body.rules = input.orderRules.map((r) => ({ attribute: r.attribute, operator: r.operator, values: r.values }));
  }
  return apiFetch(`/admin/promotions`, { method: "POST", body: JSON.stringify(body) });
}

/** 프로모션 상태/코드 수정. */
export function updatePromotion(
  id: string,
  patch: Partial<{ status: PromotionStatus; code: string }>
): Promise<{ promotion: Promotion }> {
  return apiFetch(`/admin/promotions/${id}`, { method: "POST", body: JSON.stringify(patch) });
}

/** 프로모션 삭제. */
export function deletePromotion(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/promotions/${id}`, { method: "DELETE" });
}

/** 상품 연계 타겟 규칙 add/remove(items 프로모션 사후 편집). */
export function batchTargetRules(
  id: string,
  body: { create?: { attribute: string; operator: string; values: string[] }[]; delete?: string[] }
): Promise<unknown> {
  return apiFetch(`/admin/promotions/${id}/target-rules/batch`, { method: "POST", body: JSON.stringify(body) });
}

/** 할인 요약 텍스트(목록 표시용). */
export function discountText(p: Promotion): string {
  const am = p.application_method;
  if (!am) return "—";
  const scope = am.target_type === "order" ? "주문" : am.target_type === "items" ? "상품" : "배송";
  if (am.type === "percentage") return `${scope} ${am.value}% 할인`;
  return `${scope} ${am.value.toLocaleString("ko-KR")} ${(am.currency_code ?? "").toUpperCase()} 할인`;
}

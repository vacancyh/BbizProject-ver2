/**
 * 특가(Price List) — Medusa REST /admin/price-lists 호출/래핑(로직 복사 X).
 *  - 회원등급별/기간 특가 설정 목록·생성·상태변경·삭제.
 *  - 가격(prices) 항목 추가는 변형(variant) ID 매핑이 필요하므로 후속 구현.
 *  - rules.customer.groups.id 로 회원 그룹 타겟팅.
 */
import { apiFetch } from "./client";

export type PriceListStatus = "active" | "draft";
export type PriceListType = "sale" | "override";

export type PriceList = {
  id: string;
  title: string;
  description: string;
  status: PriceListStatus;
  type: PriceListType;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  /** 규칙 — 회원 그룹 타겟팅 등. 예: { "customer.groups.id": ["grp_id"] } */
  rules: Record<string, string[]>;
};

/** 목록 조회. 기본 100건, 최신순. */
export function listPriceLists(): Promise<{ price_lists: PriceList[]; count: number }> {
  return apiFetch(`/admin/price-lists?limit=100&order=-created_at`);
}

/** 단건 조회. */
export function getPriceList(id: string): Promise<{ price_list: PriceList }> {
  return apiFetch(`/admin/price-lists/${id}`);
}

export type CreatePriceListInput = {
  title: string;
  description: string;
  type?: PriceListType;
  status?: PriceListStatus;
  starts_at?: string;
  ends_at?: string;
  /** 회원 그룹 ID 배열 — 미지정 시 전체 대상. */
  groupIds?: string[];
};

/** 특가 생성. */
export function createPriceList(input: CreatePriceListInput): Promise<{ price_list: PriceList }> {
  const rules: Record<string, string[]> = {};
  if (input.groupIds && input.groupIds.length > 0) {
    rules["customer.groups.id"] = input.groupIds;
  }
  return apiFetch(`/admin/price-lists`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      type: input.type ?? "sale",
      status: input.status ?? "draft",
      ...(input.starts_at ? { starts_at: input.starts_at } : {}),
      ...(input.ends_at ? { ends_at: input.ends_at } : {}),
      rules,
    }),
  });
}

/** 상태 변경(status 단일 업데이트). */
export function updatePriceListStatus(
  id: string,
  status: PriceListStatus
): Promise<{ price_list: PriceList }> {
  return apiFetch(`/admin/price-lists/${id}`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

/** 특가 삭제. */
export function deletePriceList(id: string): Promise<{ id: string; object: string; deleted: boolean }> {
  return apiFetch(`/admin/price-lists/${id}`, { method: "DELETE" });
}

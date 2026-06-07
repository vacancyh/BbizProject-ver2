/**
 * 회원 그룹 API 호출 레이어 — Medusa REST /admin/customer-groups 호출/래핑(로직 복사 X).
 * 멤버십 등급(GAP_B)과 별개 — 이쪽은 Medusa 기본 그룹(가격리스트/프로모션 대상 지정용).
 */
import { apiFetch } from "./client";

export type CustomerGroup = {
  id: string;
  name: string;
  created_at?: string;
  customers?: { id: string; email: string; first_name: string | null; last_name: string | null }[];
};

const FIELDS = "id,name,created_at";

/** 그룹 목록(회원 수 포함). */
export function listCustomerGroups(params: { q?: string } = {}): Promise<{
  customer_groups: (CustomerGroup & { customers?: { id: string }[] })[];
  count: number;
}> {
  const qs = new URLSearchParams({ fields: FIELDS + ",customers.id", order: "name", limit: "100" });
  if (params.q) qs.set("q", params.q);
  return apiFetch(`/admin/customer-groups?${qs.toString()}`);
}

/** 그룹 상세(소속 회원). */
export function getCustomerGroup(id: string): Promise<{ customer_group: CustomerGroup }> {
  const qs = new URLSearchParams({
    fields: FIELDS + ",customers.id,customers.email,customers.first_name,customers.last_name",
  });
  return apiFetch(`/admin/customer-groups/${id}?${qs.toString()}`);
}

/** 그룹 생성. */
export function createCustomerGroup(name: string): Promise<{ customer_group: CustomerGroup }> {
  return apiFetch(`/admin/customer-groups`, { method: "POST", body: JSON.stringify({ name }) });
}

/** 그룹 수정. */
export function updateCustomerGroup(id: string, name: string): Promise<{ customer_group: CustomerGroup }> {
  return apiFetch(`/admin/customer-groups/${id}`, { method: "POST", body: JSON.stringify({ name }) });
}

/** 그룹 삭제. */
export function deleteCustomerGroup(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/customer-groups/${id}`, { method: "DELETE" });
}

/** 그룹 ↔ 회원 추가/제거. */
export function updateGroupCustomers(
  id: string,
  body: { add?: string[]; remove?: string[] }
): Promise<{ customer_group: CustomerGroup }> {
  return apiFetch(`/admin/customer-groups/${id}/customers`, { method: "POST", body: JSON.stringify(body) });
}

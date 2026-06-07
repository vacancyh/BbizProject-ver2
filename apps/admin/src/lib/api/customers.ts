/**
 * 회원 API 호출 레이어 — Medusa REST /admin/customers 호출/래핑(로직 복사 X).
 * PII(이메일/전화/주소)는 화면에서 maskEmail/maskPhone 으로 마스킹 표시.
 */
import { apiFetch } from "./client";

export type CustomerGroupRef = { id: string; name: string };

export type CustomerAddress = {
  id: string;
  address_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string | null;
};

export type CustomerOrderRef = {
  id: string;
  display_id: number;
  status: string;
  currency_code: string;
  created_at: string;
};

export type CustomerListItem = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  has_account: boolean;
  created_at: string;
  groups?: CustomerGroupRef[];
};

export type CustomerDetail = CustomerListItem & {
  addresses?: CustomerAddress[];
  orders?: CustomerOrderRef[];
};

const LIST_FIELDS = "id,email,first_name,last_name,phone,company_name,has_account,created_at,groups.id,groups.name";
const DETAIL_FIELDS =
  LIST_FIELDS +
  ",addresses.id,addresses.address_name,addresses.first_name,addresses.last_name,addresses.phone," +
  "addresses.address_1,addresses.address_2,addresses.city,addresses.province,addresses.postal_code,addresses.country_code," +
  "orders.id,orders.display_id,orders.status,orders.currency_code,orders.created_at";

export type CustomerListParams = { q?: string; has_account?: string; limit?: number; offset?: number };

/** 회원 목록(Medusa REST). */
export function listCustomers(
  params: CustomerListParams = {}
): Promise<{ customers: CustomerListItem[]; count: number }> {
  const qs = new URLSearchParams({ fields: LIST_FIELDS, order: "-created_at" });
  if (params.q) qs.set("q", params.q);
  if (params.has_account) qs.set("has_account", params.has_account);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/customers?${qs.toString()}`);
}

/** 회원 상세(주소/주문이력/그룹). */
export function getCustomer(id: string): Promise<{ customer: CustomerDetail }> {
  const qs = new URLSearchParams({ fields: DETAIL_FIELDS });
  return apiFetch(`/admin/customers/${id}?${qs.toString()}`);
}

/** 회원 생성. */
export function createCustomer(input: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
}): Promise<{ customer: CustomerDetail }> {
  return apiFetch(`/admin/customers`, { method: "POST", body: JSON.stringify(input) });
}

/** 회원 수정. */
export function updateCustomer(
  id: string,
  patch: Partial<{ first_name: string | null; last_name: string | null; phone: string | null; company_name: string | null }>
): Promise<{ customer: CustomerDetail }> {
  return apiFetch(`/admin/customers/${id}`, { method: "POST", body: JSON.stringify(patch) });
}

/** 회원 주소 추가. */
export function addCustomerAddress(
  id: string,
  address: Partial<Omit<CustomerAddress, "id">>
): Promise<{ customer: CustomerDetail }> {
  return apiFetch(`/admin/customers/${id}/addresses`, { method: "POST", body: JSON.stringify(address) });
}

/** 회원 ↔ 그룹 지정/해제(그룹 측 batch 엔드포인트). */
export function setCustomerGroups(
  customerId: string,
  groupId: string,
  op: "add" | "remove"
): Promise<unknown> {
  const body = op === "add" ? { add: [customerId] } : { remove: [customerId] };
  return apiFetch(`/admin/customer-groups/${groupId}/customers`, { method: "POST", body: JSON.stringify(body) });
}

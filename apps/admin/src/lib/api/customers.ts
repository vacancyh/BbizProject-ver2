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

export type CustomerListParams = {
  q?: string;
  has_account?: string;
  /** 고객 그룹 id 필터(등급/VIP). */
  group_id?: string;
  /** 가입일 범위(ISO) — created_at >= from. */
  created_at_from?: string;
  /** 가입일 범위(ISO) — created_at <= to. */
  created_at_to?: string;
  /** 이름 정확매칭(내부 분리검색용). */
  first_name?: string;
  last_name?: string;
  limit?: number;
  offset?: number;
};

/** 한글 성+이름(공백/영문/숫자 없는 2자 이상 한글) 판별 — 풀네임 분리검색 대상. */
function isHangulFullName(s: string): boolean {
  return /^[가-힣]{2,}$/.test(s);
}

/** 파라미터 → /admin/customers 1회 호출. */
function fetchCustomers(
  params: CustomerListParams
): Promise<{ customers: CustomerListItem[]; count: number }> {
  const qs = new URLSearchParams({ fields: LIST_FIELDS, order: "-created_at" });
  if (params.q) qs.set("q", params.q);
  if (params.first_name) qs.set("first_name", params.first_name);
  if (params.last_name) qs.set("last_name", params.last_name);
  if (params.has_account) qs.set("has_account", params.has_account);
  if (params.group_id) qs.set("groups[id]", params.group_id);
  if (params.created_at_from) qs.set("created_at[$gte]", params.created_at_from);
  if (params.created_at_to) qs.set("created_at[$lte]", params.created_at_to);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/customers?${qs.toString()}`);
}

/**
 * 회원 목록(Medusa REST).
 *
 * 이름 검색 보정: Medusa `q` 는 컬럼별 부분일치라 "성+이름"(예: 김민준)이 매칭되지 않는다
 * (성 "김" → last_name, 이름 "민준" → first_name 으로 분리 저장되기 때문).
 * 한글 풀네임이면 성(첫 글자)+이름(나머지)으로 분리해 정확매칭을 먼저 시도하고,
 * 결과가 없으면 기존 `q`(부분일치: 성만/이름만/이메일/연락처)로 폴백한다.
 */
export async function listCustomers(
  params: CustomerListParams = {}
): Promise<{ customers: CustomerListItem[]; count: number }> {
  const { q, ...rest } = params;
  const term = q?.trim();
  if (term && isHangulFullName(term)) {
    const split = await fetchCustomers({ ...rest, last_name: term[0], first_name: term.slice(1) });
    if (split.count > 0) return split;
    return fetchCustomers({ ...rest, q: term });
  }
  return fetchCustomers({ ...rest, q: term || undefined });
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

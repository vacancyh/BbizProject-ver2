/**
 * 정책 저장소 API 호출 레이어 — 백엔드 /admin/policy/* 래핑.
 * 변경은 이중확인(confirm)을 백엔드에 전달(FE ConfirmModal 재확인 후 호출).
 */
import { apiFetch } from "./client";

export type SystemPolicy = {
  id: string;
  key: string;
  label: string;
  category: string;
  value: unknown;
  value_type: "string" | "number" | "boolean";
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type PolicyHistory = {
  id: string;
  policy_key: string;
  before: unknown;
  after: unknown;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

/** 정책 목록(최초 호출 시 백엔드가 기본 정책 시드) */
export function getPolicies(
  category?: string
): Promise<{ policies: SystemPolicy[]; count: number }> {
  const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/admin/policy/policies${suffix}`);
}

/** 정책 1건 + 변경이력 */
export function getPolicy(
  key: string
): Promise<{ policy: SystemPolicy; history: PolicyHistory[] }> {
  return apiFetch(`/admin/policy/policies/${encodeURIComponent(key)}`);
}

/** 정책 값 변경(이중확인 confirm=true 전송) */
export function setPolicy(
  key: string,
  value: unknown
): Promise<{ policy: SystemPolicy }> {
  return apiFetch(`/admin/policy/policies/${encodeURIComponent(key)}`, {
    method: "POST",
    body: JSON.stringify({ value, confirm: true }),
  });
}

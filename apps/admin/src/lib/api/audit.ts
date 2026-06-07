/**
 * 감사 로그 API 호출 레이어 — 백엔드 /admin/audit/* 래핑(읽기 전용).
 */
import { apiFetch } from "./client";

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  method: string;
  path: string;
  target_type: string | null;
  target_id: string | null;
  status_code: number;
  diff: unknown;
  ip: string | null;
  created_at: string;
};

export type AuditQuery = {
  actor_id?: string;
  method?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

/** 감사 로그 조회(최신순, 필터/페이지네이션) */
export function getLogs(
  params: AuditQuery = {}
): Promise<{ items: AuditLog[]; count: number }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/admin/audit/logs${suffix}`);
}

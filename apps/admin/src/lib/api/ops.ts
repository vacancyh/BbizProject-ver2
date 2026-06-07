/**
 * 운영 도구(Ops) — /admin/ops/* 호출/래핑 (로직 복사 X).
 *
 * backend API 계약 (t009):
 *  - GET  /admin/ops/health          : 인프라 헬스 조회
 *  - GET  /admin/ops/maintenance     : 점검모드 상태 조회
 *  - POST /admin/ops/maintenance     : 점검모드 전환
 *
 * spec: t009_점검모드.md
 */
import { apiFetch } from "./client";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type MaintenanceScope = "all" | "storefront" | "admin";

export type MaintenanceState = {
  id: string;
  scope: MaintenanceScope;
  enabled: boolean;
  message: string | null;
};

export type HealthResponse = {
  db: "up" | "down";
  redis: "up" | "down";
  overall: "up" | "down";
};

export type MaintenanceListResponse = {
  maintenance_states: MaintenanceState[];
};

export type ToggleMaintenanceInput = {
  scope: MaintenanceScope;
  enabled: boolean;
  message?: string;
};

// ─── API 래퍼 ──────────────────────────────────────────────────────────────

/** 인프라 헬스 조회 — GET /admin/ops/health */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/admin/ops/health");
}

/** 점검모드 상태 목록 조회 — GET /admin/ops/maintenance */
export async function listMaintenanceStates(scope?: MaintenanceScope): Promise<MaintenanceListResponse> {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  return apiFetch<MaintenanceListResponse>(`/admin/ops/maintenance${qs}`);
}

/** 점검모드 전환 — POST /admin/ops/maintenance */
export async function toggleMaintenance(
  input: ToggleMaintenanceInput
): Promise<{ maintenance_state: MaintenanceState }> {
  return apiFetch("/admin/ops/maintenance", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * RBAC(관리자 권한) API 호출 레이어 — 백엔드 /admin/rbac/* 래핑.
 * 로직은 백엔드 rbac 모듈에 있고, 여기서는 호출만 한다(가드레일: 로직 복사 금지).
 */
import { apiFetch } from "./client";

export type RoleKey = "super" | "operation" | "cs" | "marketer";

export type Role = {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
  is_system: boolean;
};

export type RolePermission = {
  id: string;
  role_key: RoleKey;
  menu_id: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type RbacMatrix = {
  roles: Role[];
  permissions: RolePermission[];
  menus: string[];
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role_key: RoleKey | null;
};

export type PermFlags = Partial<
  Pick<RolePermission, "can_read" | "can_create" | "can_update" | "can_delete">
>;

/** 등급 + 권한 매트릭스 + 메뉴 목록 조회(최초 호출 시 백엔드가 기본값 시드) */
export function getMatrix(): Promise<RbacMatrix> {
  return apiFetch<RbacMatrix>("/admin/rbac/roles");
}

/** 등급별 메뉴 권한 수정(super 변경 불가) */
export function setRolePermission(
  roleKey: RoleKey,
  menuId: string,
  perms: PermFlags
): Promise<{ permission: RolePermission }> {
  return apiFetch(`/admin/rbac/roles/${roleKey}`, {
    method: "POST",
    body: JSON.stringify({ menu_id: menuId, ...perms }),
  });
}

/** 관리자 계정 + 등급 목록 */
export function getUsers(): Promise<{ users: AdminUserRow[]; count: number }> {
  return apiFetch("/admin/rbac/users");
}

/** 관리자에게 등급 부여 */
export function assignRole(
  userId: string,
  roleKey: RoleKey
): Promise<{ user_role: { id: string; user_id: string; role_key: RoleKey } }> {
  return apiFetch(`/admin/rbac/users/${userId}`, {
    method: "POST",
    body: JSON.stringify({ role_key: roleKey }),
  });
}

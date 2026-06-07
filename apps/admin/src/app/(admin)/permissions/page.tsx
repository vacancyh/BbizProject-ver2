"use client";

/**
 * 권한 관리 화면 — RBAC 등급별 메뉴 CRUD 매트릭스 + 관리자 등급 부여.
 * 데이터/액션은 lib/api/rbac.ts(백엔드 /admin/rbac/*) 호출. 로직 복사 없음.
 */
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  PageHeader,
  DataTable,
  ConfirmModal,
  EmptyState,
  LoadingSkeleton,
  useToast,
  type Column,
} from "@/components/ui";
import { ROUTE_TITLES } from "@/lib/nav/navigation";
import {
  getMatrix,
  getUsers,
  setRolePermission,
  assignRole,
  type RbacMatrix,
  type RolePermission,
  type AdminUserRow,
  type RoleKey,
  type PermFlags,
} from "@/lib/api/rbac";

const EDITABLE_ROLES: { key: RoleKey; label: string }[] = [
  { key: "operation", label: "운영" },
  { key: "cs", label: "고객지원" },
  { key: "marketer", label: "마케터" },
];

const CRUD: { field: keyof PermFlags; label: string }[] = [
  { field: "can_read", label: "조회" },
  { field: "can_create", label: "생성" },
  { field: "can_update", label: "수정" },
  { field: "can_delete", label: "삭제" },
];

const ROLE_LABEL: Record<RoleKey, string> = {
  super: "최고관리자",
  operation: "운영",
  cs: "고객지원",
  marketer: "마케터",
};

function menuLabel(menuId: string): string {
  return ROUTE_TITLES[menuId] ?? menuId;
}

export default function PermissionsPage() {
  const toast = useToast();
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("operation");
  const [pending, setPending] = useState<{ user: AdminUserRow; role: RoleKey } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, u] = await Promise.all([getMatrix(), getUsers()]);
      setMatrix(m);
      setUsers(u.users);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // 활성 등급의 메뉴별 권한 맵
  const permByMenu = useMemo(() => {
    const map: Record<string, RolePermission> = {};
    matrix?.permissions
      .filter((p) => p.role_key === activeRole)
      .forEach((p) => {
        map[p.menu_id] = p;
      });
    return map;
  }, [matrix, activeRole]);

  async function togglePerm(menuId: string, field: keyof PermFlags) {
    const cur = permByMenu[menuId];
    const next = !(cur?.[field] ?? false);
    // 낙관적 갱신
    setMatrix((prev) => {
      if (!prev) return prev;
      const permissions = prev.permissions.map((p) =>
        p.role_key === activeRole && p.menu_id === menuId ? { ...p, [field]: next } : p
      );
      return { ...prev, permissions };
    });
    try {
      await setRolePermission(activeRole, menuId, { [field]: next });
      toast.show(`${ROLE_LABEL[activeRole]} · ${menuLabel(menuId)} 권한을 변경했습니다.`);
    } catch (e) {
      toast.show(`권한 변경 실패: ${(e as Error).message}`, "danger");
      void load(); // 실패 시 서버 상태로 복구
    }
  }

  async function confirmAssign() {
    if (!pending) return;
    const { user, role } = pending;
    setPending(null);
    try {
      await assignRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role_key: role } : u)));
      toast.show(`${user.email} 등급을 ${ROLE_LABEL[role]}(으)로 변경했습니다. 변경 내역은 감사 로그에 기록됩니다.`);
    } catch (e) {
      toast.show(`등급 변경 실패: ${(e as Error).message}`, "danger");
    }
  }

  const userColumns: Column<AdminUserRow>[] = [
    {
      header: "관리자",
      cell: (u) => (
        <div>
          <div className="font-medium text-text">{u.email}</div>
          {u.name ? <div className="text-xs text-text-3">{u.name}</div> : null}
        </div>
      ),
    },
    {
      header: "현재 등급",
      cell: (u) => (
        <span className="text-sm text-text-2">
          {u.role_key ? ROLE_LABEL[u.role_key] : "미지정(전체 권한)"}
        </span>
      ),
    },
    {
      header: "등급 변경",
      width: "180px",
      cell: (u) => (
        <select
          className="h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
          value={u.role_key ?? ""}
          onChange={(e) => {
            const role = e.target.value as RoleKey;
            if (role && role !== u.role_key) setPending({ user: u, role });
          }}
        >
          <option value="" disabled>
            등급 선택
          </option>
          {(["super", "operation", "cs", "marketer"] as RoleKey[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="권한 관리"
        sub="등급별 메뉴 CRUD 권한 + 관리자 등급 부여 · 변경 내역은 감사 로그에 기록됩니다"
        gap="B"
      />

      {error ? (
        <div className="mb-4 rounded bg-surface p-4 shadow-xs">
          <EmptyState icon={<ShieldCheck size={26} />} title="권한 정보를 불러오지 못했습니다" description={error} />
        </div>
      ) : null}

      {/* 권한 매트릭스 */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-text">등급별 메뉴 권한</h2>
          <div className="ml-auto flex gap-1 rounded-pill bg-surface-2 p-1">
            {EDITABLE_ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setActiveRole(r.key)}
                className={
                  "rounded-pill px-3 py-1 text-xs font-bold transition-colors " +
                  (activeRole === r.key ? "bg-primary text-white" : "text-text-2 hover:text-text")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded bg-info-weak px-3 py-2 text-xs text-info">
          최고관리자(super)는 항상 전체 권한이며 변경할 수 없습니다. 미지정 관리자도 전체 권한입니다.
        </div>

        {loading ? (
          <div className="mt-3 rounded bg-surface p-4 shadow-xs">
            <LoadingSkeleton rows={8} />
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded bg-surface shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold text-text-2">
                  <th className="px-4 py-3">메뉴</th>
                  {CRUD.map((c) => (
                    <th key={c.field} className="px-3 py-3 text-center" style={{ width: "84px" }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(matrix?.menus ?? []).map((menuId) => (
                  <tr key={menuId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-text">{menuLabel(menuId)}</td>
                    {CRUD.map((c) => {
                      const checked = permByMenu[menuId]?.[c.field] ?? false;
                      return (
                        <td key={c.field} className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-primary"
                            checked={checked}
                            onChange={() => togglePerm(menuId, c.field)}
                            aria-label={`${menuLabel(menuId)} ${c.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 관리자 등급 부여 */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-text">관리자 등급</h2>
        <DataTable
          columns={userColumns}
          data={users}
          rowKey={(u) => u.id}
          loading={loading}
          emptyTitle="관리자 계정이 없습니다"
        />
      </section>

      <ConfirmModal
        open={!!pending}
        title="등급을 변경하시겠습니까?"
        message="관리자 접근 권한이 즉시 변경되며, 변경 내역은 감사 로그에 기록됩니다."
        confirmText="등급 변경"
        meta={
          pending
            ? {
                target: `${pending.user.email} → ${ROLE_LABEL[pending.role]}`,
                effect: "접근 가능 메뉴/작업 변경",
                reversible: true,
              }
            : undefined
        }
        onConfirm={confirmAssign}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

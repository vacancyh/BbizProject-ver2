"use client";

/**
 * 점검 모드 화면 — t009_점검모드 spec 구현
 *
 * - scope(all/storefront/admin)별 점검모드 ON/OFF 토글
 * - 안내 메시지(최대 200자) 입력
 * - 헬스 상태(/admin/ops/health) 표시
 * - backend API: /admin/ops/maintenance (GET 상태, POST 토글), /admin/ops/health
 */
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  getHealth,
  listMaintenanceStates,
  toggleMaintenance,
  type MaintenanceScope,
  type MaintenanceState,
  type HealthResponse,
} from "@/lib/api/ops";

// ─── 상수 ───────────────────────────────────────────────────────────────────

const SCOPES: { value: MaintenanceScope; label: string; desc: string }[] = [
  { value: "all", label: "전체", desc: "스토어프런트 + 어드민 모두 점검" },
  { value: "storefront", label: "스토어프런트", desc: "쇼핑몰 고객 화면 점검" },
  { value: "admin", label: "어드민", desc: "관리자 화면 점검" },
];

const MAX_MESSAGE_LEN = 200;

// ─── 헬스 배지 ──────────────────────────────────────────────────────────────

function HealthBadge({ status }: { status: "up" | "down" | null }) {
  if (status === null) return <span style={{ color: "var(--text-3)", fontSize: 12 }}>조회 중…</span>;
  const isUp = status === "up";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 10px",
        borderRadius: 20,
        background: isUp ? "#dcfce7" : "#fee2e2",
        color: isUp ? "#16a34a" : "#dc2626",
        border: `1px solid ${isUp ? "#bbf7d0" : "#fecaca"}`,
      }}
    >
      {isUp ? "정상" : "장애"}
    </span>
  );
}

// ─── 점검모드 카드 ──────────────────────────────────────────────────────────

function MaintenanceScopeCard({
  scopeDef,
  state,
  onToggle,
}: {
  scopeDef: { value: MaintenanceScope; label: string; desc: string };
  state: MaintenanceState | undefined;
  onToggle: (scope: MaintenanceScope, enabled: boolean, message: string) => void;
}) {
  const enabled = state?.enabled ?? false;
  const [msg, setMsg] = useState(state?.message ?? "");
  const [msgDirty, setMsgDirty] = useState(false);

  // state 변경 시 메시지 동기화 (토글 후)
  useEffect(() => {
    if (!msgDirty) setMsg(state?.message ?? "");
  }, [state, msgDirty]);

  return (
    <div
      className="card mb16"
      style={{ border: enabled ? "1.5px solid var(--danger, #dc2626)" : undefined }}
    >
      <div className="card-pad">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {scopeDef.label}
              {enabled && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 8px",
                    borderRadius: 20,
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                  }}
                >
                  점검 중
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{scopeDef.desc}</div>
          </div>
          {/* ON/OFF 토글 버튼 */}
          <button
            type="button"
            className={`btn ${enabled ? "danger" : "primary"}`}
            style={{ fontSize: 13, minWidth: 90 }}
            onClick={() => onToggle(scopeDef.value, !enabled, msg)}
          >
            {enabled ? "점검 해제" : "점검 시작"}
          </button>
        </div>

        {/* 안내 메시지 */}
        <div>
          <span className="field-l" style={{ fontSize: 12 }}>
            안내 메시지 (선택, 최대 {MAX_MESSAGE_LEN}자)
          </span>
          <textarea
            className="inp"
            rows={2}
            maxLength={MAX_MESSAGE_LEN}
            value={msg}
            placeholder="점검 안내 메시지를 입력하세요. (미입력 시 기본 메시지 표시)"
            style={{ resize: "vertical", minHeight: 60 }}
            onChange={(e) => { setMsg(e.target.value); setMsgDirty(true); }}
            onBlur={() => {
              // 포커스 해제 시 현재 메시지로 토글하지 않음 — 버튼 클릭 시에만 전송
              setMsgDirty(false);
            }}
          />
          <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "right" }}>
            {msg.length}/{MAX_MESSAGE_LEN}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const toast = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [states, setStates] = useState<MaintenanceState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);

  // 토글 확인 모달
  const [confirmTarget, setConfirmTarget] = useState<{
    scope: MaintenanceScope;
    enabled: boolean;
    message: string;
  } | null>(null);
  const [toggling, setToggling] = useState(false);

  // 헬스 조회
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const h = await getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // 점검모드 상태 조회
  const loadStates = useCallback(async () => {
    setStatesLoading(true);
    try {
      const { maintenance_states } = await listMaintenanceStates();
      setStates(maintenance_states);
    } catch (e) {
      toast.show((e as Error)?.message ?? "점검모드 상태 불러오기 실패", "danger");
    } finally {
      setStatesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHealth();
    loadStates();
  }, [loadHealth, loadStates]);

  function requestToggle(scope: MaintenanceScope, enabled: boolean, message: string) {
    setConfirmTarget({ scope, enabled, message });
  }

  async function doToggle() {
    if (!confirmTarget) return;
    setToggling(true);
    try {
      const { maintenance_state } = await toggleMaintenance({
        scope: confirmTarget.scope,
        enabled: confirmTarget.enabled,
        message: confirmTarget.message || undefined,
      });
      setStates((prev) => {
        const exists = prev.find((s) => s.scope === maintenance_state.scope);
        if (exists) return prev.map((s) => (s.scope === maintenance_state.scope ? maintenance_state : s));
        return [...prev, maintenance_state];
      });
      toast.show(
        `${SCOPES.find((s) => s.value === confirmTarget.scope)?.label ?? confirmTarget.scope} 점검모드를 ${confirmTarget.enabled ? "활성화" : "해제"}했습니다.`,
        "success"
      );
    } catch (e) {
      toast.show((e as Error)?.message ?? "점검모드 전환 실패", "danger");
    } finally {
      setToggling(false);
      setConfirmTarget(null);
    }
  }

  const scopeLabel = confirmTarget
    ? SCOPES.find((s) => s.value === confirmTarget.scope)?.label ?? confirmTarget.scope
    : "";

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>점검 모드</h1>
            <div className="ph-sub">스토어프런트·어드민 서비스별 점검모드 ON/OFF 및 안내 메시지 설정</div>
          </div>
        </div>

        {/* 헬스 상태 카드 */}
        <div className="card mb16">
          <div className="card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Activity size={16} style={{ color: "var(--text-2)" }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>인프라 헬스 상태</span>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 12, marginLeft: "auto" }}
                onClick={loadHealth}
                disabled={healthLoading}
                title="헬스 새로고침"
              >
                <RefreshCw size={13} className={healthLoading ? "animate-spin" : ""} />
                새로고침
              </button>
            </div>
            {healthLoading ? (
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>조회 중…</div>
            ) : !health ? (
              <div style={{ fontSize: 13, color: "var(--danger)" }}>헬스 상태를 불러올 수 없습니다.</div>
            ) : (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>DB</span>
                  <HealthBadge status={health.db} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>Redis</span>
                  <HealthBadge status={health.redis} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>전체</span>
                  <HealthBadge status={health.overall} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 점검모드 안내 */}
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#92400e",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <b>점검 모드는 최고관리자(SUPER)만 전환 가능합니다.</b>
            <br />
            점검 중에는 해당 scope 서비스 접근이 제한됩니다. 안내 메시지를 입력하면 방문자에게 표시됩니다.
          </div>
        </div>

        {/* scope별 점검모드 카드 */}
        {statesLoading ? (
          <div className="card">
            <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          </div>
        ) : (
          SCOPES.map((scopeDef) => {
            const state = states.find((s) => s.scope === scopeDef.value);
            return (
              <MaintenanceScopeCard
                key={scopeDef.value}
                scopeDef={scopeDef}
                state={state}
                onToggle={requestToggle}
              />
            );
          })
        )}
      </div>

      {/* 점검모드 전환 확인 모달 */}
      <ConfirmModal
        open={!!confirmTarget && !toggling}
        title={confirmTarget?.enabled ? `${scopeLabel} 점검모드를 활성화하시겠습니까?` : `${scopeLabel} 점검모드를 해제하시겠습니까?`}
        message={
          confirmTarget?.enabled
            ? `${scopeLabel} 서비스 접근이 제한됩니다.${confirmTarget?.message ? `\n\n안내 메시지: "${confirmTarget.message}"` : ""}`
            : `${scopeLabel} 서비스를 정상 운영으로 전환합니다.`
        }
        confirmText={confirmTarget?.enabled ? "점검 시작" : "점검 해제"}
        meta={{
          target: scopeLabel,
          effect: confirmTarget?.enabled ? "서비스 접근 제한" : "정상 운영 전환",
          reversible: true,
        }}
        onConfirm={doToggle}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

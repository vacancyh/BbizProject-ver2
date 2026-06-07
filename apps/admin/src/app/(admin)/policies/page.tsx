"use client";

/**
 * 정책 관리 화면 — system_policies 통합 + 이중확인 변경 + 변경이력.
 * 데이터/액션은 lib/api/policy.ts(백엔드 /admin/policy/*) 호출.
 * 변경은 ConfirmModal 재확인(이중확인) 후 백엔드에 confirm=true 로 전달.
 */
import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import {
  PageHeader,
  ConfirmModal,
  DetailDrawer,
  LoadingSkeleton,
  EmptyState,
  useToast,
} from "@/components/ui";
import {
  getPolicies,
  getPolicy,
  setPolicy,
  type SystemPolicy,
  type PolicyHistory,
} from "@/lib/api/policy";

function displayValue(p: SystemPolicy): string {
  if (p.value_type === "boolean") return p.value ? "사용함" : "사용 안 함";
  return String(p.value ?? "");
}

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
  } catch {
    return iso;
  }
}

export default function PoliciesPage() {
  const toast = useToast();
  const [policies, setPolicies] = useState<SystemPolicy[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ policy: SystemPolicy; value: unknown } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ policy: SystemPolicy; rows: PolicyHistory[] } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPolicies();
      setPolicies(res.policies);
      const d: Record<string, string | boolean> = {};
      res.policies.forEach((p) => {
        d[p.key] = p.value_type === "boolean" ? Boolean(p.value) : String(p.value ?? "");
      });
      setDrafts(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // 분류별 그룹
  const grouped = useMemo(() => {
    const g: Record<string, SystemPolicy[]> = {};
    policies.forEach((p) => {
      (g[p.category] ??= []).push(p);
    });
    return g;
  }, [policies]);

  function requestSave(p: SystemPolicy) {
    const draft = drafts[p.key];
    let value: unknown = draft;
    if (p.value_type === "number") {
      const n = Number(draft);
      if (!Number.isFinite(n)) {
        toast.show("숫자를 입력해 주세요.", "danger");
        return;
      }
      value = n;
    } else if (p.value_type === "boolean") {
      value = Boolean(draft);
    }
    if (value === p.value) {
      toast.show("변경된 내용이 없습니다.", "info");
      return;
    }
    setPending({ policy: p, value });
  }

  async function confirmSave() {
    if (!pending) return;
    const { policy, value } = pending;
    setPending(null);
    try {
      await setPolicy(policy.key, value);
      setPolicies((prev) =>
        prev.map((p) => (p.key === policy.key ? { ...p, value } : p))
      );
      toast.show(`'${policy.label}' 정책을 변경했습니다. 변경 내역은 정책 이력·감사 로그에 기록됩니다.`);
    } catch (e) {
      toast.show(`정책 변경 실패: ${(e as Error).message}`, "danger");
      void load();
    }
  }

  async function openHistory(p: SystemPolicy) {
    try {
      const res = await getPolicy(p.key);
      setHistoryFor({ policy: p, rows: res.history });
    } catch (e) {
      toast.show(`이력 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  return (
    <div>
      <PageHeader
        title="정책 관리"
        sub="운영 정책 통합 저장소 · 변경 시 이중확인 + 변경이력 기록(최고관리자)"
        gap="B"
      />

      {error ? (
        <div className="mb-4 rounded bg-surface p-4 shadow-xs">
          <EmptyState title="정책을 불러오지 못했습니다" description={error} />
        </div>
      ) : null}

      {loading ? (
        <div className="rounded bg-surface p-4 shadow-xs">
          <LoadingSkeleton rows={8} />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-bold text-text">{category}</h2>
              <div className="overflow-hidden rounded bg-surface shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold text-text-2">
                      <th className="px-4 py-3" style={{ width: "30%" }}>정책</th>
                      <th className="px-4 py-3" style={{ width: "30%" }}>값</th>
                      <th className="px-4 py-3">설명</th>
                      <th className="px-4 py-3 text-right" style={{ width: "150px" }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.key} className="border-b border-border last:border-0 align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text">{p.label}</div>
                          <div className="mt-0.5 text-[11px] text-text-3">{p.key}</div>
                        </td>
                        <td className="px-4 py-3">
                          {p.value_type === "boolean" ? (
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={Boolean(drafts[p.key])}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [p.key]: e.target.checked }))
                                }
                              />
                              <span className="text-sm text-text-2">
                                {drafts[p.key] ? "사용함" : "사용 안 함"}
                              </span>
                            </label>
                          ) : (
                            <input
                              type={p.value_type === "number" ? "number" : "text"}
                              className="h-9 w-40 rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
                              value={String(drafts[p.key] ?? "")}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [p.key]: e.target.value }))
                              }
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-2">{p.description}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openHistory(p)}
                              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1.5 text-xs font-medium hover:bg-surface-2"
                            >
                              <History size={13} /> 이력
                            </button>
                            <button
                              type="button"
                              onClick={() => requestSave(p)}
                              className="rounded-sm bg-primary px-2.5 py-1.5 text-xs font-bold text-white hover:bg-primary-press"
                            >
                              변경
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!pending}
        title="정책을 변경하시겠습니까?"
        message="운영 정책 변경은 즉시 적용되며, 변경 전/후 값이 정책 이력과 감사 로그에 기록됩니다."
        confirmText="정책 변경"
        meta={
          pending
            ? {
                target: pending.policy.label,
                effect: `${displayValue(pending.policy)} → ${
                  pending.policy.value_type === "boolean"
                    ? pending.value
                      ? "사용함"
                      : "사용 안 함"
                    : String(pending.value)
                }`,
                reversible: true,
              }
            : undefined
        }
        onConfirm={confirmSave}
        onCancel={() => setPending(null)}
      />

      <DetailDrawer
        open={!!historyFor}
        title={historyFor ? `변경이력 — ${historyFor.policy.label}` : ""}
        sub={historyFor?.policy.key}
        onClose={() => setHistoryFor(null)}
      >
        {historyFor && historyFor.rows.length ? (
          <ul className="space-y-3">
            {historyFor.rows.map((h) => (
              <li key={h.id} className="rounded-sm border border-border p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-text-3">
                  <span>{formatKst(h.created_at)}</span>
                  <span>{h.actor_email ?? h.actor_id ?? "—"}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-sm bg-surface-2 px-2 py-0.5 text-text-2">{String(h.before ?? "—")}</span>
                  <span className="text-text-3">→</span>
                  <span className="rounded-sm bg-primary-weak px-2 py-0.5 font-medium text-primary">{String(h.after ?? "—")}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="변경 이력이 없습니다" description="이 정책은 아직 변경된 적이 없습니다." />
        )}
      </DetailDrawer>
    </div>
  );
}

"use client";

/**
 * 고객 그룹 관리 — Medusa /admin/customer-groups 호출/래핑(로직 복사 X).
 *  ① pageHeader(그룹 생성)
 *  ② filterBar(검색)
 *  ③ card: table(그룹명·회원수·생성일·액션) + 생성 모달
 *  ④ 그룹 상세 패널(소속 회원 목록 + 회원 추가/제거)
 *
 * members/page.tsx UI 패턴(page-header, card, dt, 인라인 토스트) 정합.
 * 멤버십 등급(GAP_B)과 별개 — 이쪽은 Medusa 기본 그룹(가격리스트/프로모션 대상 지정용).
 */
import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Users, UserPlus, UserMinus, X, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState, LoadingSkeleton } from "@/components/ui";
import {
  listCustomerGroups,
  createCustomerGroup,
  getCustomerGroup,
  updateGroupCustomers,
  type CustomerGroup,
} from "@/lib/api/customer-groups";
import { listCustomers, type CustomerListItem } from "@/lib/api/customers";

/* ── 유틸 ─────────────────────────────────────────────── */

function formatKst(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

/** 그룹 회원 수(customers.id 배열 길이). */
function memberCount(g: CustomerGroup & { customers?: { id: string }[] }): number {
  return g.customers?.length ?? 0;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const masked = local.slice(0, Math.max(2, Math.ceil(local.length / 2))) + "***";
  return `${masked}@${domain}`;
}

/* ── 타입 ─────────────────────────────────────────────── */

type GroupRow = CustomerGroup & { customers?: { id: string }[] };
type GroupMember = { id: string; email: string; first_name: string | null; last_name: string | null };

/* ── 페이지 루트 ─────────────────────────────────────── */

export default function CustomerGroupsPage() {
  return <CustomerGroupsScreen />;
}

/* ── 메인 화면 ─────────────────────────────────────────── */

function CustomerGroupsScreen() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // 생성 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 그룹 상세 패널
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // 회원 추가 검색
  const [addSearch, setAddSearch] = useState("");
  const [addSearchResults, setAddSearchResults] = useState<CustomerListItem[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [opBusy, setOpBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ── 토스트 ── */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  /* ── 그룹 목록 로드 ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCustomerGroups(q ? { q } : {});
      setRows(res.customer_groups);
      setCount(res.count);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── 그룹 상세 로드(소속 회원 포함) ── */
  async function openGroupDetail(g: GroupRow) {
    setSelectedGroup(g);
    setGroupMembers([]);
    setAddOpen(false);
    setAddSearch("");
    setAddSearchResults([]);
    setDetailLoading(true);
    try {
      const { customer_group } = await getCustomerGroup(g.id);
      setGroupMembers((customer_group.customers ?? []) as GroupMember[]);
    } catch {
      /* silent */
    } finally {
      setDetailLoading(false);
    }
  }

  /* ── 회원 추가 검색 ── */
  async function searchCustomersToAdd(keyword: string) {
    if (!keyword.trim()) {
      setAddSearchResults([]);
      return;
    }
    setAddSearchLoading(true);
    try {
      const res = await listCustomers({ q: keyword.trim(), limit: 10 });
      // 이미 그룹에 있는 회원은 제외
      const memberIds = new Set(groupMembers.map((m) => m.id));
      setAddSearchResults(res.customers.filter((c) => !memberIds.has(c.id)));
    } catch {
      /* silent */
    } finally {
      setAddSearchLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchCustomersToAdd(addSearch);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSearch]);

  /* ── 회원 그룹 추가 ── */
  async function handleAddMember(customer: CustomerListItem) {
    if (!selectedGroup || opBusy) return;
    setOpBusy(true);
    try {
      await updateGroupCustomers(selectedGroup.id, { add: [customer.id] });
      // 로컬 상태 즉시 반영
      const newMember: GroupMember = {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      };
      setGroupMembers((prev) => [...prev, newMember]);
      setAddSearchResults((prev) => prev.filter((c) => c.id !== customer.id));
      showToast(`${maskEmail(customer.email)} 회원을 그룹에 추가했습니다.`);
      // 그룹 목록의 회원 수 업데이트
      await load();
    } catch {
      showToast("회원 추가에 실패했습니다.");
    } finally {
      setOpBusy(false);
    }
  }

  /* ── 회원 그룹 제거 ── */
  async function handleRemoveMember(member: GroupMember) {
    if (!selectedGroup || opBusy) return;
    setOpBusy(true);
    try {
      await updateGroupCustomers(selectedGroup.id, { remove: [member.id] });
      setGroupMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast(`${maskEmail(member.email)} 회원을 그룹에서 제거했습니다.`);
      // 그룹 목록의 회원 수 업데이트
      await load();
    } catch {
      showToast("회원 제거에 실패했습니다.");
    } finally {
      setOpBusy(false);
    }
  }

  /* ── 그룹 생성 ── */
  async function submitCreate() {
    const name = newName.trim();
    if (!name) {
      showToast("그룹명을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createCustomerGroup(name);
      setCreateOpen(false);
      setNewName("");
      showToast("그룹을 생성했습니다.");
      await load();
    } catch {
      showToast("그룹 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="scr">
      {/* ① pageHeader */}
      <div className="page-header">
        <div className="ph-l">
          <h1>고객 그룹</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}개 · 가격리스트·프로모션 대상 지정용
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn primary" type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            그룹 생성
          </button>
        </div>
      </div>

      {/* ② filterBar */}
      <div className="filterbar">
        <div className="search-input">
          <Search size={15} />
          <input
            type="text"
            placeholder="그룹명 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
          />
        </div>
        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => { setQ(""); }}>
          초기화
        </button>
        <button className="btn primary" type="button" onClick={() => void load()}>
          조회
        </button>
      </div>

      {/* 레이아웃: 목록 + 상세 패널 */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        {/* ③ card: 그룹 목록 테이블 */}
        <div className="card" data-kind="customer-groups" style={{ flex: selectedGroup ? "0 0 55%" : "1" }}>
          {loading ? (
            <div style={{ padding: "16px" }}>
              <LoadingSkeleton rows={6} />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Users size={26} />}
              title="고객 그룹이 없습니다"
              description="가격리스트·프로모션 대상으로 쓸 그룹을 생성해 주세요."
              action={
                <button className="btn primary" type="button" onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  그룹 생성
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>그룹명</th>
                    <th className="num">회원 수</th>
                    <th>생성일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => (
                    <tr
                      key={g.id}
                      style={{
                        cursor: "pointer",
                        background: selectedGroup?.id === g.id ? "var(--surface-2, #f8f9fa)" : undefined,
                      }}
                      onClick={() => void openGroupDetail(g)}
                    >
                      <td className="strong">{g.name}</td>
                      <td className="num">{memberCount(g).toLocaleString("ko-KR")}명</td>
                      <td className="muted">{formatKst(g.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn sm"
                          type="button"
                          onClick={() => void openGroupDetail(g)}
                        >
                          회원 관리
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ④ 그룹 상세 패널(소속 회원 + 회원 추가/제거) */}
        {selectedGroup ? (
          <div
            className="card"
            style={{ flex: "0 0 43%", maxHeight: "80vh", overflowY: "auto" }}
            data-kind="group-detail"
          >
            {/* 패널 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 16px 0",
                marginBottom: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>{selectedGroup.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)" }}>
                  소속 회원 {groupMembers.length.toLocaleString("ko-KR")}명
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => { setAddOpen((v) => !v); setAddSearch(""); setAddSearchResults([]); }}
                >
                  <UserPlus size={14} />
                  회원 추가
                  {addOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  className="btn sm icon"
                  type="button"
                  aria-label="패널 닫기"
                  onClick={() => { setSelectedGroup(null); setGroupMembers([]); setAddOpen(false); }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* 회원 추가 검색 영역 */}
            {addOpen ? (
              <div style={{ padding: "0 16px 12px" }}>
                <div className="search-input" style={{ marginBottom: "8px" }}>
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="이메일·이름으로 회원 검색"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {addSearchLoading ? (
                  <div style={{ padding: "8px", fontSize: "12px", color: "var(--text-3)" }}>검색 중…</div>
                ) : addSearchResults.length === 0 && addSearch.trim() ? (
                  <div style={{ padding: "8px", fontSize: "12px", color: "var(--text-3)" }}>
                    검색 결과가 없거나 이미 그룹에 속한 회원입니다.
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      overflow: "hidden",
                      maxHeight: "160px",
                      overflowY: "auto",
                    }}
                  >
                    {addSearchResults.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border)",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ color: "var(--text)" }}>
                          {maskEmail(c.email)}
                          {(c.first_name || c.last_name) ? (
                            <span style={{ color: "var(--text-3)", marginLeft: "6px" }}>
                              {`${c.last_name ?? ""}${c.first_name ?? ""}`.trim()}
                            </span>
                          ) : null}
                        </span>
                        <button
                          className="btn sm primary"
                          type="button"
                          disabled={opBusy}
                          onClick={() => void handleAddMember(c)}
                        >
                          추가
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* 소속 회원 목록 */}
            <div style={{ padding: "0 16px 16px" }}>
              {detailLoading ? (
                <LoadingSkeleton rows={4} />
              ) : groupMembers.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "var(--text-3)",
                    fontSize: "13px",
                  }}
                >
                  소속 회원이 없습니다.
                  <br />
                  위 「회원 추가」 버튼으로 회원을 추가하세요.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>이메일</th>
                        <th>이름</th>
                        <th>제거</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontSize: "12px" }}>{maskEmail(m.email)}</td>
                          <td style={{ fontSize: "12px" }}>
                            {`${m.last_name ?? ""}${m.first_name ?? ""}`.trim() || "—"}
                          </td>
                          <td>
                            <button
                              className="btn sm danger"
                              type="button"
                              disabled={opBusy}
                              onClick={() => void handleRemoveMember(m)}
                              aria-label="그룹에서 제거"
                            >
                              <UserMinus size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* 그룹 생성 모달 */}
      {createOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded bg-surface p-5 shadow-lg">
            <h3 className="text-base font-bold text-text">고객 그룹 생성</h3>
            <p className="mt-1.5 text-sm text-text-2">
              가격리스트·프로모션 대상으로 지정할 그룹을 만듭니다.
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="cg-name">
                그룹명
              </label>
              <input
                id="cg-name"
                type="text"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                placeholder="예: VIP 고객"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void submitCreate(); }}
                autoFocus
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn"
                type="button"
                onClick={() => { setCreateOpen(false); setNewName(""); }}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => void submitCreate()}
                disabled={submitting}
              >
                {submitting ? "생성 중…" : "생성"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 토스트 */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--surface)",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 999,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

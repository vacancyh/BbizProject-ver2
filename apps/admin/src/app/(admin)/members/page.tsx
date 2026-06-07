"use client";

/**
 * 회원 관리 — 프로토타입 SC.members 1:1 이식.
 *  ① pageHeader(엑셀 다운로드 + SMS·메일 발송)
 *  ② KPI 4카드(전체/이번달신규/VIP/휴면)
 *  ③ filterBar(검색 + 등급/가입일/상태)
 *  ④ card: segtabs + table(아이디·이름·등급·가입일·주문수·누적구매액·상태·kebab) + pagination
 *  ⑤ 상세 드로어(DRAWERS.member) — 회원정지(OPS.suspendMember) + 등급변경(OPS.changeGrade)
 * 데이터: Medusa REST 실연동. 적립금/등급(GAP_B) 없으면 "—" 표시.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Users,
  UserPlus,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatCurrency } from "@/lib/utils";
import { maskEmail, maskPhone } from "@/lib/orders/status";
import {
  getMemberD5,
  earnPoints,
  applySanction,
  liftSanction,
  type MemberD5,
  SANCTION_LABEL,
} from "@/lib/api/members";
import {
  getConsentStatus,
  getConsentHistory,
  recordConsent,
  ALL_CONSENT_CHANNELS,
  CONSENT_CHANNEL_LABEL,
  type ConsentStatus,
  type ConsentChannel,
  type ConsentHistoryRecord,
} from "@/lib/api/consents";
import {
  listCustomers,
  getCustomer,
  type CustomerListItem,
  type CustomerDetail,
} from "@/lib/api/customers";
import {
  listCustomerGroups,
  type CustomerGroup,
} from "@/lib/api/customer-groups";

const PAGE_SIZE = 20;

/* ── 유틸 ─────────────────────────────────────────────── */

function fullName(c: { first_name: string | null; last_name: string | null }): string {
  const n = `${c.last_name ?? ""}${c.first_name ?? ""}`.trim();
  return n || "—";
}

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

/** 동의 타임라인용 — 날짜+시:분(KST). 동의/철회 시점 표시. */
function fmtConsentTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function gradeFromGroups(groups?: { id: string; name: string }[]): string {
  if (!groups || groups.length === 0) return "일반";
  const names = groups.map((g) => g.name);
  if (names.some((n) => n.includes("VIP"))) return "VIP";
  if (names.some((n) => n.includes("우수"))) return "우수";
  return names[0] ?? "일반";
}

function gradeBadgeClass(grade: string): string {
  if (grade === "VIP") return "badge primary";
  if (grade === "우수") return "badge info";
  return "badge neutral";
}

function statusBadge(active: boolean) {
  return active
    ? { label: "정상", cls: "badge success" }
    : { label: "비활성", cls: "badge neutral" };
}

/** d5 조작 실패 토스트 메시지(401 분기). */
function opErrMsg(e: unknown, action: string): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") return "세션이 만료되었습니다.";
  return `${action}에 실패했습니다.${msg ? ` (${msg})` : ""}`;
}

/* ── 페이지 루트 ─────────────────────────────────────── */

export default function MembersPage() {
  return <MembersScreen />;
}

/* ── 메인 화면 ─────────────────────────────────────────── */

function MembersScreen() {
  /* ── 상태 ── */
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterJoin, setFilterJoin] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [groups, setGroups] = useState<CustomerGroup[]>([]);

  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberD5, setMemberD5] = useState<MemberD5 | null>(null);
  // d5 t008 동의이력 — 채널별 현재 동의 + 2년 재확인 필요 채널
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  // d5 t008 동의이력 — 시각 타임라인(동의/철회 전체 이력, append-only)
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryRecord[] | null>(null);

  const [activeTab, setActiveTab] = useState(0);

  const [suspendTarget, setSuspendTarget] = useState<CustomerDetail | null>(null);
  const [gradeTarget, setGradeTarget] = useState<CustomerDetail | null>(null);

  // d5 갭B 조작 — 제재 적용/해제 confirm 대상 + 진행 중 플래그
  const [sanctionTarget, setSanctionTarget] = useState<CustomerDetail | null>(null);
  const [sanctionReason, setSanctionReason] = useState("");
  const [liftTarget, setLiftTarget] = useState<CustomerDetail | null>(null);
  const [opBusy, setOpBusy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  /* ── 토스트 ── */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  /* ── 날짜 필터 오프셋 계산 ── */
  function joinOffset(): { created_at_from?: string } {
    const now = new Date();
    if (filterJoin === "today") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { created_at_from: d.toISOString() };
    }
    if (filterJoin === "week") {
      const d = new Date(now.getTime() - 7 * 86400000);
      return { created_at_from: d.toISOString() };
    }
    if (filterJoin === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { created_at_from: d.toISOString() };
    }
    return {};
  }

  /* ── 데이터 로드 ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof listCustomers>[0] = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      if (q) params.q = q;
      if (filterStatus === "active") params.has_account = "true";
      if (filterStatus === "guest") params.has_account = "false";
      const res = await listCustomers(params);
      setRows(res.customers);
      setCount(res.count);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [q, filterStatus, page]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── 그룹 목록(등급 select용) ── */
  useEffect(() => {
    listCustomerGroups()
      .then(({ customer_groups }) => setGroups(customer_groups))
      .catch(() => undefined);
  }, []);

  /* ── 회원 상세 열기 ── */
  async function openDetail(c: CustomerListItem) {
    setDetail(null);
    setMemberD5(null);
    setConsent(null);
    setConsentHistory(null);
    setDetailLoading(true);
    try {
      const { customer } = await getCustomer(c.id);
      setDetail(customer);
      // d5 갭B 데이터(멤버십/포인트/제재) 비동기 로드(개별 실패 허용)
      getMemberD5(c.id).then(setMemberD5).catch(() => undefined);
      // d5 t008 동의이력 비동기 로드(실패 허용)
      getConsentStatus(c.id).then(setConsent).catch(() => undefined);
      // d5 t008 동의이력 시각 타임라인 비동기 로드(실패 허용)
      getConsentHistory(c.id).then((h) => setConsentHistory(h.records)).catch(() => undefined);
    } catch {
      /* silent */
    } finally {
      setDetailLoading(false);
    }
  }

  /* ── d5 갭B 데이터 재조회(조작 성공 후) ── */
  async function refetchD5(customerId: string) {
    try {
      const d5 = await getMemberD5(customerId);
      setMemberD5(d5);
    } catch {
      /* silent */
    }
  }

  /* ── 동의이력 재조회(기록 성공 후) — 현재 상태 + 시각 타임라인 ── */
  async function refetchConsent(customerId: string) {
    try {
      const c = await getConsentStatus(customerId);
      setConsent(c);
    } catch {
      /* silent */
    }
    try {
      const h = await getConsentHistory(customerId);
      setConsentHistory(h.records);
    } catch {
      /* silent */
    }
  }

  /* ── 동의/철회 기록(append-only → recordConsent) ── */
  async function handleRecordConsent(
    c: CustomerDetail,
    channel: ConsentChannel,
    agreed: boolean
  ) {
    if (opBusy) return;
    setOpBusy(true);
    try {
      await recordConsent(c.id, channel, agreed);
      await refetchConsent(c.id);
      showToast(
        `${CONSENT_CHANNEL_LABEL[channel]} ${agreed ? "동의" : "철회"}를 기록했습니다.`
      );
    } catch (e) {
      showToast(opErrMsg(e, "동의 기록"));
    } finally {
      setOpBusy(false);
    }
  }

  /* ── 포인트 적립(prompt 입력 → earnPoints) ── */
  async function handleEarnPoints(c: CustomerDetail) {
    if (opBusy) return;
    const raw = window.prompt("적립할 포인트를 입력하세요.", "1000");
    if (raw === null) return;
    const points = Number(raw.replace(/[^0-9]/g, ""));
    if (!points || points <= 0) {
      showToast("올바른 포인트 금액을 입력해 주세요.");
      return;
    }
    const reason = window.prompt("적립 사유(선택)", "관리자 수동 적립") ?? undefined;
    setOpBusy(true);
    try {
      await earnPoints(c.id, points, reason);
      await refetchD5(c.id);
      showToast(`포인트 ${points.toLocaleString("ko-KR")}P를 적립했습니다.`);
    } catch (e) {
      showToast(opErrMsg(e, "포인트 적립"));
    } finally {
      setOpBusy(false);
    }
  }

  /* ── 제재 적용(confirm 사유 입력 → applySanction) ── */
  async function handleApplySanction(c: CustomerDetail, reason: string) {
    if (opBusy) return;
    setOpBusy(true);
    try {
      await applySanction(c.id, reason);
      await refetchD5(c.id);
      showToast("제재를 적용했습니다.");
    } catch (e) {
      showToast(opErrMsg(e, "제재 적용"));
    } finally {
      setOpBusy(false);
      setSanctionTarget(null);
      setSanctionReason("");
    }
  }

  /* ── 제재 해제(confirm → liftSanction) ── */
  async function handleLiftSanction(c: CustomerDetail) {
    if (opBusy) return;
    setOpBusy(true);
    try {
      await liftSanction(c.id);
      await refetchD5(c.id);
      showToast("제재를 해제했습니다.");
    } catch (e) {
      showToast(opErrMsg(e, "제재 해제"));
    } finally {
      setOpBusy(false);
      setLiftTarget(null);
    }
  }

  /* ── 조회 버튼 ── */
  function doSearch() {
    setPage(1);
    void load();
  }

  /* ── KPI 집계(실데이터 기반) ── */
  const totalCount = count;
  const thisMonthCount = rows.filter((r) => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const vipCount = rows.filter((r) => gradeFromGroups(r.groups) === "VIP").length;

  /* ── 탭 ── */
  const TABS = ["전체", "정상 회원", "휴면 회원", "VIP"];

  /* ── 페이지 수 ── */
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const pageStart = (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="scr">
      {/* ① pageHeader */}
      <div className="page-header">
        <div className="ph-l">
          <h1>회원 관리</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}명 · 이번 달 신규 {thisMonthCount.toLocaleString("ko-KR")}명
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn" type="button">
            <Download size={16} />
            엑셀 다운로드
          </button>
          <button className="btn primary" type="button">
            <MessageSquare size={16} />
            SMS · 메일 발송
          </button>
        </div>
      </div>

      {/* ② KPI 4카드 */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {/* 전체 회원 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">전체 회원</span>
            <span className="k-ic">
              <Users size={17} />
            </span>
          </div>
          <div className="k-val">{count.toLocaleString("ko-KR")}명</div>
          <div className="k-foot">
            <span className="vs">활성 회원 {count.toLocaleString("ko-KR")}명</span>
          </div>
        </div>

        {/* 이번 달 신규 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">이번 달 신규</span>
            <span className="k-ic">
              <UserPlus size={17} />
            </span>
          </div>
          <div className="k-val">{thisMonthCount.toLocaleString("ko-KR")}명</div>
          <div className="k-foot">
            {thisMonthCount > 0 ? (
              <span className="delta up">
                <TrendingUp size={13} />
                전월 대비
              </span>
            ) : null}
            <span className="vs">전월 대비</span>
          </div>
        </div>

        {/* VIP 회원 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">VIP 회원</span>
            <span className="k-ic">
              <Star size={17} />
            </span>
          </div>
          <div className="k-val">{vipCount > 0 ? `${vipCount.toLocaleString("ko-KR")}명` : "—"}</div>
          <div className="k-foot">
            <span className="vs">누적 구매 300만원↑</span>
          </div>
        </div>

        {/* 휴면 회원 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">휴면 회원</span>
            <span className="k-ic">
              <Clock size={17} />
            </span>
          </div>
          <div className="k-val">—</div>
          <div className="k-foot">
            <span className="vs">1년 이상 미접속</span>
          </div>
        </div>
      </div>

      {/* ③ filterBar */}
      <div className="filterbar">
        <div className="search-input">
          <Search size={15} />
          <input
            type="text"
            placeholder="이름 · 아이디 · 연락처 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
          />
        </div>

        {/* 등급 select */}
        <button className="select" type="button" onClick={() => setFilterGrade("")}>
          <span className="sl-k">등급</span>
          {filterGrade || "전체"}
          <ChevronDown size={15} />
        </button>

        {/* 가입일 select */}
        <select
          className="select"
          value={filterJoin}
          onChange={(e) => { setFilterJoin(e.target.value); setPage(1); }}
          style={{ appearance: "none" }}
        >
          <option value="">가입일 전체</option>
          <option value="today">오늘</option>
          <option value="week">최근 7일</option>
          <option value="month">이번 달</option>
        </select>

        {/* 상태 select */}
        <select
          className="select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ appearance: "none" }}
        >
          <option value="">상태 전체</option>
          <option value="active">회원(계정有)</option>
          <option value="guest">비회원</option>
        </select>

        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => { setQ(""); setFilterGrade(""); setFilterJoin(""); setFilterStatus(""); setPage(1); }}>
          초기화
        </button>
        <button className="btn primary" type="button" onClick={doSearch}>
          조회
        </button>
      </div>

      {/* ④ card: segtabs + table + pagination */}
      <div className="card" data-kind="members">
        {/* segtabs */}
        <div className="segtabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              className={`segtab${activeTab === i ? " active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* table */}
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th className="col-check">
                  <input type="checkbox" />
                </th>
                <th>아이디</th>
                <th>이름</th>
                <th>등급</th>
                <th className="sortable">
                  가입일 <span className="sortcaret">▼</span>
                </th>
                <th className="num sortable">주문수</th>
                <th className="num sortable">
                  누적 구매액 <span className="sortcaret">▼</span>
                </th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text-3)" }}>
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text-3)" }}>
                    회원이 없습니다
                  </td>
                </tr>
              ) : (
                rows.map((m) => {
                  const grade = gradeFromGroups(m.groups);
                  const status = statusBadge(m.has_account);
                  const orderCount = (m as CustomerDetail).orders?.length ?? 0;
                  return (
                    <tr
                      key={m.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => void openDetail(m)}
                    >
                      <td className="col-check" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" />
                      </td>
                      <td className="strong">{maskEmail(m.email)}</td>
                      <td>{fullName(m)}</td>
                      <td>
                        <span className={gradeBadgeClass(grade)}>
                          <span className="bdot" />
                          {grade}
                        </span>
                      </td>
                      <td className="muted">{formatKst(m.created_at)}</td>
                      <td className="num">{orderCount > 0 ? orderCount.toLocaleString("ko-KR") : "—"}</td>
                      <td className="num strong">—</td>
                      <td>
                        <span className={status.cls}>
                          <span className="bdot" />
                          {status.label}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="kebab" type="button" aria-label="더보기">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="tablefoot">
          <span className="tf-info">
            {count > 0 ? `${pageStart.toLocaleString("ko-KR")}–${pageEnd.toLocaleString("ko-KR")} / ${count.toLocaleString("ko-KR")}명` : "0명"}
          </span>
          <span className="spacer" />
          <button
            className="btn sm icon"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={pg}
                className={`btn sm${pg === page ? " primary" : ""}`}
                type="button"
                onClick={() => setPage(pg)}
              >
                {pg}
              </button>
            );
          })}
          <button
            className="btn sm icon"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="다음 페이지"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ⑤ 회원 상세 드로어 (DRAWERS.member) */}
      <DetailDrawer
        open={!!detail || detailLoading}
        title="회원 상세"
        sub={detail ? maskEmail(detail.email) : undefined}
        status={
          detail ? (
            <span className={gradeBadgeClass(gradeFromGroups(detail.groups))}>
              <span className="bdot" />
              {gradeFromGroups(detail.groups)}
            </span>
          ) : undefined
        }
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <div className="detail-f" style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
              <div className="danger-zone">
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => setSuspendTarget(detail)}
                >
                  회원 정지
                </button>
              </div>
              <span className="spacer" />
              <button
                className="btn"
                type="button"
                onClick={() => setGradeTarget(detail)}
              >
                등급 변경
              </button>
              <button className="btn" type="button" onClick={() => setDetail(null)}>
                닫기
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => showToast("메시지 발송 화면으로 이동")}
              >
                메시지 발송
              </button>
            </div>
          ) : undefined
        }
      >
        {detailLoading && !detail ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)" }}>
            불러오는 중…
          </div>
        ) : detail ? (
          <MemberDrawerBody
            detail={detail}
            d5={memberD5}
            consent={consent}
            consentHistory={consentHistory}
            opBusy={opBusy}
            onEarnPoints={() => void handleEarnPoints(detail)}
            onApplySanction={() => setSanctionTarget(detail)}
            onLiftSanction={() => setLiftTarget(detail)}
            onRecordConsent={(channel, agreed) =>
              void handleRecordConsent(detail, channel, agreed)
            }
          />
        ) : null}
      </DetailDrawer>

      {/* 회원 정지 confirm (OPS.suspendMember) */}
      <ConfirmModal
        open={!!suspendTarget}
        danger
        title="회원을 정지하시겠습니까?"
        message="정지된 회원은 로그인과 주문이 제한됩니다."
        confirmText="회원 정지"
        meta={{
          target: suspendTarget ? `${fullName(suspendTarget)} (${maskEmail(suspendTarget.email)})` : undefined,
          effect: "로그인·주문 제한",
          reversible: true,
        }}
        onConfirm={() => {
          setSuspendTarget(null);
          setDetail(null);
          showToast("회원을 정지했습니다. 처리 내역이 관리 로그에 기록되었습니다.");
        }}
        onCancel={() => setSuspendTarget(null)}
      />

      {/* 등급 변경 confirm (OPS.changeGrade) */}
      <ConfirmModal
        open={!!gradeTarget}
        title="등급을 변경하시겠습니까?"
        message="회원 등급을 변경합니다."
        confirmText="등급 변경"
        meta={{
          target: gradeTarget ? `${fullName(gradeTarget)} · 현재 ${gradeFromGroups(gradeTarget.groups)}` : undefined,
          effect: "등급 혜택·쿠폰 적용 변경",
          reversible: true,
        }}
        onConfirm={() => {
          setGradeTarget(null);
          showToast("등급을 변경했습니다.");
        }}
        onCancel={() => setGradeTarget(null)}
      />

      {/* 제재 적용 confirm (d5 applySanction — 단계 상승) */}
      <ConfirmModal
        open={!!sanctionTarget}
        danger
        title="제재를 적용하시겠습니까?"
        message="제재 단계가 한 단계 상승합니다(경고 → 7일 → 30일 → 영구)."
        confirmText={opBusy ? "처리 중…" : "제재 적용"}
        meta={{
          target: sanctionTarget ? `${fullName(sanctionTarget)} (${maskEmail(sanctionTarget.email)})` : undefined,
          effect: "제재 단계 상승 · 로그인 차단 가능",
          reversible: true,
        }}
        onConfirm={() => {
          if (sanctionTarget) void handleApplySanction(sanctionTarget, sanctionReason.trim() || "관리자 수동 제재");
        }}
        onCancel={() => { if (!opBusy) { setSanctionTarget(null); setSanctionReason(""); } }}
      >
        <div style={{ marginTop: "12px", textAlign: "left" }}>
          <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="sanction-reason">
            제재 사유
          </label>
          <input
            id="sanction-reason"
            type="text"
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
            placeholder="예: 반복 노쇼·악성 클레임"
            value={sanctionReason}
            onChange={(e) => setSanctionReason(e.target.value)}
          />
        </div>
      </ConfirmModal>

      {/* 제재 해제 confirm (d5 liftSanction) */}
      <ConfirmModal
        open={!!liftTarget}
        title="제재를 해제하시겠습니까?"
        message="현재 적용된 제재가 해제되어 로그인·주문 제한이 풀립니다."
        confirmText={opBusy ? "처리 중…" : "제재 해제"}
        meta={{
          target: liftTarget ? `${fullName(liftTarget)} (${maskEmail(liftTarget.email)})` : undefined,
          effect: "제재 해제 · 제한 해제",
          reversible: true,
        }}
        onConfirm={() => { if (liftTarget) void handleLiftSanction(liftTarget); }}
        onCancel={() => { if (!opBusy) setLiftTarget(null); }}
      />

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

/* ── 드로어 본문 (DRAWERS.member body) ──────────────────────── */

function MemberDrawerBody({
  detail,
  d5,
  consent,
  consentHistory,
  opBusy,
  onEarnPoints,
  onApplySanction,
  onLiftSanction,
  onRecordConsent,
}: {
  detail: CustomerDetail;
  d5: MemberD5 | null;
  consent: ConsentStatus | null;
  consentHistory: ConsentHistoryRecord[] | null;
  opBusy: boolean;
  onEarnPoints: () => void;
  onApplySanction: () => void;
  onLiftSanction: () => void;
  onRecordConsent: (channel: ConsentChannel, agreed: boolean) => void;
}) {
  const grade = gradeFromGroups(detail.groups);
  const initial = fullName(detail)[0] ?? "?";
  const totalOrders = detail.orders?.length ?? 0;
  // 제재 해제 버튼 활성화 조건: 현재 활성 제재가 있을 때만
  const hasActiveSanction = !!d5?.sanction?.is_active_sanction;

  return (
    <div>
      {/* avatar + name */}
      <div className="dsec">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
          <span
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "50%",
              background: "#E0E7FF",
              color: "#3730A3",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            {initial}
          </span>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
              {fullName(detail)}
              <span className={gradeBadgeClass(grade)}>
                <span className="bdot" />
                {grade}
              </span>
            </div>
            <div className="muted" style={{ fontSize: "13px" }}>
              {maskEmail(detail.email)} · {statusBadge(detail.has_account).label} 회원
            </div>
          </div>
        </div>
      </div>

      {/* 회원 정보 */}
      <div className="dsec">
        <div className="dsec-t">회원 정보</div>
        <dl className="kv">
          <dt>이메일</dt>
          <dd>{maskEmail(detail.email)}</dd>
          <dt>연락처</dt>
          <dd>{maskPhone(detail.phone)}</dd>
          <dt>가입일</dt>
          <dd>{formatKst(detail.created_at)}</dd>
          <dt>최근 접속</dt>
          <dd>—</dd>
          <dt>마케팅 수신</dt>
          <dd>—</dd>
        </dl>
      </div>

      {/* 구매 요약 */}
      <div className="dsec">
        <div className="dsec-t">구매 요약</div>
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "0" }}>
          <div className="kpi">
            <div className="k-top">
              <span className="k-label">총 주문</span>
            </div>
            <div className="k-val">{totalOrders > 0 ? `${totalOrders.toLocaleString("ko-KR")}건` : "—"}</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-label">누적 적립대상액</span>
            </div>
            <div className="k-val">
              {d5?.membership ? formatCurrency(d5.membership.membership.accrued_amount) : "—"}
            </div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-label">적립금</span>
            </div>
            <div className="k-val">
              {d5?.points ? `${d5.points.balance.toLocaleString("ko-KR")}P` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 멤버십 · 제재 (d5 갭B 모듈 연동) */}
      <div className="dsec">
        <div className="dsec-t">멤버십 · 제재</div>
        <dl className="kv">
          <dt>등급</dt>
          <dd>{d5?.membership ? d5.membership.membership.current_tier : "—"}</dd>
          <dt>다음 등급</dt>
          <dd>
            {d5?.membership?.next_tier
              ? `${d5.membership.next_tier.name} (${formatCurrency(d5.membership.next_tier.remaining)} 남음)`
              : d5?.membership
                ? "최고 등급"
                : "—"}
          </dd>
          <dt>포인트 잔액</dt>
          <dd>{d5?.points ? `${d5.points.balance.toLocaleString("ko-KR")}P` : "—"}</dd>
          <dt>제재 상태</dt>
          <dd>
            {d5?.sanction
              ? d5.sanction.level
                ? `${SANCTION_LABEL[d5.sanction.level] ?? d5.sanction.level}${
                    d5.sanction.login_blocked ? " · 로그인 차단" : ""
                  }`
                : "정상"
              : "—"}
          </dd>
        </dl>

        {/* d5 갭B 조작 버튼: 포인트 적립 / 제재 적용 / 제재 해제 */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
          <button className="btn sm" type="button" disabled={opBusy} onClick={onEarnPoints}>
            포인트 적립
          </button>
          <button className="btn sm danger" type="button" disabled={opBusy} onClick={onApplySanction}>
            제재 적용
          </button>
          <button
            className="btn sm"
            type="button"
            disabled={opBusy || !hasActiveSanction}
            onClick={onLiftSanction}
          >
            제재 해제
          </button>
        </div>
      </div>

      {/* 동의 이력 (d5 t008 — consent_log append-only / 2년 재확인) */}
      <div className="dsec">
        <div className="dsec-t">동의 이력</div>
        {consent ? (
          <>
            <table className="dt" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>채널</th>
                  <th>현재 상태</th>
                  <th>재확인</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ALL_CONSENT_CHANNELS.map((ch) => {
                  const agreed = consent.consents[ch] ?? false;
                  const needsReconsent = consent.needs_reconsent.includes(ch);
                  return (
                    <tr key={ch}>
                      <td>{CONSENT_CHANNEL_LABEL[ch]}</td>
                      <td>
                        <span className={agreed ? "badge success" : "badge neutral"}>
                          <span className="bdot" />
                          {agreed ? "동의" : "철회"}
                        </span>
                      </td>
                      <td>
                        {needsReconsent ? (
                          <span className="badge warning">
                            <span className="bdot" />
                            2년 경과
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn sm"
                          type="button"
                          disabled={opBusy}
                          onClick={() => onRecordConsent(ch, !agreed)}
                        >
                          {agreed ? "철회 기록" : "동의 기록"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="muted" style={{ fontSize: "12px", marginTop: "8px" }}>
              현재 상태는 채널별 최신 기록 기준입니다. 기록은 append-only 로 누적되며,
              동의 후 2년 경과 채널은 재확인 대상으로 표시됩니다. 마케팅 발송(d12)은 동의 채널만 대상입니다.
            </div>

            {/* 시각 타임라인 — 동의/철회 전체 이력(최신순). d5 t008 §3 S1 (채널·동의/철회·시점) */}
            <div className="dsec-t" style={{ marginTop: "16px", fontSize: "13px" }}>
              변경 타임라인
            </div>
            {consentHistory === null ? (
              <div className="muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                타임라인을 불러오는 중입니다…
              </div>
            ) : consentHistory.length === 0 ? (
              <div className="muted" style={{ fontSize: "12px", marginTop: "4px" }}>
                기록된 동의/철회 이력이 없습니다.
              </div>
            ) : (
              <table className="dt" style={{ width: "100%", marginTop: "8px" }}>
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>채널</th>
                    <th>변경</th>
                  </tr>
                </thead>
                <tbody>
                  {[...consentHistory]
                    .sort(
                      (a, b) =>
                        new Date(b.recordedAt).getTime() -
                        new Date(a.recordedAt).getTime()
                    )
                    .map((rec, i) => (
                      <tr key={`${rec.channel}-${rec.recordedAt}-${i}`}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {fmtConsentTime(rec.recordedAt)}
                        </td>
                        <td>{CONSENT_CHANNEL_LABEL[rec.channel] ?? rec.channel}</td>
                        <td>
                          <span
                            className={rec.agreed ? "badge success" : "badge neutral"}
                          >
                            <span className="bdot" />
                            {rec.agreed ? "동의" : "철회"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div className="dline" style={{ justifyContent: "center", color: "var(--text-3)", fontSize: "13px" }}>
            동의 이력을 불러오는 중이거나 데이터가 없습니다
          </div>
        )}
      </div>

      {/* 최근 주문 */}
      <div className="dsec">
        <div className="dsec-t">최근 주문</div>
        {detail.orders && detail.orders.length > 0 ? (
          detail.orders.slice(0, 5).map((o) => (
            <div key={o.id} className="dline">
              <span className="dl-img" />
              <span className="dl-t">
                <b>#{o.display_id}</b>
                <span>{formatKst(o.created_at)} · {o.id.slice(0, 14)}</span>
              </span>
              <span className="badge neutral">
                <span className="bdot" />
                {o.status}
              </span>
            </div>
          ))
        ) : (
          <div className="dline" style={{ justifyContent: "center", color: "var(--text-3)", fontSize: "13px" }}>
            주문 이력 없음
          </div>
        )}
      </div>
    </div>
  );
}

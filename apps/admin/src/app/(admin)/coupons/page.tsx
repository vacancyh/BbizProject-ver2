"use client";

/**
 * 쿠폰·프로모션 — 디자인 프로토타입(admin-screen-misc.js) SC.coupons 1:1 이식.
 *  - pageHeader: 기획전 만들기 + 쿠폰 발급 버튼
 *  - dash-grid2 mb16: (a) 기획전 배너 카드  (b) 쿠폰 사용 추이 도넛
 *  - 쿠폰 목록 카드: 테이블(쿠폰명/혜택/대상/사용·발급/상태/kebab) + 페이지네이션
 *  - 행 클릭 → DetailDrawer (.dsec .kv)
 *  - 즉시 종료 → ConfirmModal (danger)
 *  Medusa REST /admin/promotions 래핑(로직 복사 X). 통화: KRW 단독.
 */
import { useCallback, useEffect, useState } from "react";
import { Store, Plus, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { DonutChart } from "@/components/dashboard/Charts";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui";
import {
  listPromotions,
  getPromotion,
  updatePromotion,
  discountText,
  type Promotion,
  type PromotionStatus,
} from "@/lib/api/promotions";

const PAGE_SIZE = 20;

// ── 상태 뱃지 ──────────────────────────────────────────────────────────────────
const STATUS: Record<PromotionStatus, { label: string; tone: string }> = {
  active:   { label: "진행중",  tone: "success" },
  draft:    { label: "예약",    tone: "neutral" },
  inactive: { label: "종료",   tone: "danger"  },
};

function statusCounts(rows: Promotion[]) {
  let active = 0, draft = 0, inactive = 0;
  rows.forEach((p) => {
    if (p.status === "active") active++;
    else if (p.status === "draft") draft++;
    else inactive++;
  });
  return { active, draft, inactive };
}

function targetLabel(p: Promotion): string {
  const t = p.application_method?.target_type;
  if (t === "order") return "주문 전체";
  if (t === "items") return "상품/분류";
  if (t === "shipping_methods") return "배송";
  return "—";
}

function _fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ko-KR"); } catch { return iso; }
}

export default function CouponsPage() {
  const toast = useToast();

  // ── 데이터 상태 ──────────────────────────────────────────────────────────────
  const [rows, setRows]     = useState<Promotion[]>([]);
  const [count, setCount]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState(false);

  // ── 드로어 / 모달 ──────────────────────────────────────────────────────────
  const [detail, setDetail] = useState<Promotion | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<Promotion | null>(null);

  // ── 목록 로드 ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPromotions({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
      setRows(res.promotions);
      setCount(res.count);
    } catch (e) {
      toast.show(`프로모션 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => { void load(); }, [load]);

  // ── 행 클릭 → 상세 ───────────────────────────────────────────────────────────
  async function openDetail(p: Promotion) {
    setDetail(null);
    try {
      const { promotion } = await getPromotion(p.id);
      setDetail(promotion);
    } catch (e) {
      toast.show(`상세 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  // ── 즉시 종료 확인 → inactive ────────────────────────────────────────────────
  async function doEndCoupon() {
    if (!confirmEnd) return;
    setBusy(true);
    try {
      await updatePromotion(confirmEnd.id, { status: "inactive" });
      toast.show("쿠폰을 종료했습니다.");
      setConfirmEnd(null);
      setDetail(null);
      await load();
    } catch (e) {
      toast.show(`종료 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  // ── 페이지네이션 ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const { active: activeCount, draft: draftCount, inactive: inactiveCount } = statusCounts(rows);
  const subText = `진행중 ${activeCount} · 예약 ${draftCount} · 종료 ${inactiveCount}`;

  // ── 도넛: 사용/미사용 집계 (used 필드 기준, 없으면 0) ────────────────────────
  const totalUsed   = rows.reduce((a, p) => a + (p.used ?? 0), 0);
  const totalIssued = rows.reduce((a, p) => a + (p.limit ?? 0), 0);
  const totalUnused = Math.max(0, totalIssued - totalUsed);
  const donutSegments = [
    { label: "사용", value: totalUsed,   color: "#2563EB" },
    { label: "미사용", value: totalUnused, color: "#E5E7EB" },
  ];
  const donutTotal = totalUsed + totalUnused || 1;
  const usageRate  = Math.round((totalUsed / donutTotal) * 100);

  // ── 기획전 배너: 첫 번째 active 프로모션을 대표로 사용 ─────────────────────
  const featured = rows.find((p) => p.status === "active") ?? rows[0] ?? null;

  return (
    <div className="scr">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>쿠폰 · 프로모션</h1>
          <div className="ph-sub">{subText}</div>
        </div>
        <div className="ph-actions">
          <button type="button" className="btn">
            <Store size={16} />
            <span>기획전 만들기</span>
          </button>
          <button type="button" className="btn primary">
            <Plus size={16} />
            <span>쿠폰 발급</span>
          </button>
        </div>
      </div>

      {/* ② dash-grid2: 기획전 배너 + 쿠폰 사용 추이 */}
      <div className="dash-grid2 mb16">
        {/* (a) 기획전 배너 카드 */}
        <div className="card">
          <div className="card-pad" style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div
              style={{
                width: "120px", height: "84px", borderRadius: "10px",
                background: "var(--surface-2)", border: "1px solid var(--border)",
                flex: "0 0 auto", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--text-3)", fontSize: "12px",
              }}
            >
              배너
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, marginBottom: "6px" }}>
                {featured ? featured.code : "—"}
              </div>
              <div className="muted" style={{ fontSize: "13px" }}>
                {featured
                  ? discountText(featured)
                  : "등록된 쿠폰이 없습니다"}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                {featured ? (
                  <>
                    <span className={`badge ${STATUS[featured.status]?.tone ?? "neutral"}`}>
                      <span className="bdot" />
                      {STATUS[featured.status]?.label ?? featured.status}
                    </span>
                    {featured.is_automatic ? (
                      <span className="badge primary">
                        <span className="bdot" />
                        자동 적용
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* (b) 쿠폰 사용 추이 카드 */}
        <div className="card">
          <div className="card-h">
            <h3>쿠폰 사용 추이</h3>
            <span className="ch-sub">발급 한도 기준</span>
          </div>
          <div className="donut-wrap">
            <div className="chart-pad" style={{ padding: "8px 0" }}>
              <DonutChart
                segments={donutSegments}
                centerTop={`${usageRate}%`}
                centerSub="사용률"
              />
            </div>
            <div className="donut-legend">
              <div className="dl">
                <i style={{ background: "#2563EB" }} />
                <span className="dl-n">사용</span>
                <b>{totalUsed.toLocaleString("ko-KR")}장</b>
              </div>
              <div className="dl">
                <i style={{ background: "#E5E7EB" }} />
                <span className="dl-n">미사용</span>
                <b>{totalUnused.toLocaleString("ko-KR")}장</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ③ 쿠폰 목록 카드 */}
      <div className="card">
        <div className="card-h">
          <h3>쿠폰 목록</h3>
          <span className="ch-sub">{count.toLocaleString("ko-KR")}건</span>
        </div>
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th>쿠폰명</th>
                <th>혜택</th>
                <th>대상</th>
                <th className="num">사용 / 발급</th>
                <th>상태</th>
                <th style={{ width: "48px" }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: "32px 0" }}>
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: "32px 0" }}>
                    등록된 쿠폰이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const s = STATUS[p.status] ?? { label: p.status, tone: "neutral" };
                  const used   = p.used ?? 0;
                  const issued = p.limit ?? 0;
                  return (
                    <tr key={p.id} onClick={() => void openDetail(p)}>
                      <td className="strong">{p.code}</td>
                      <td className="muted">{discountText(p)}</td>
                      <td className="muted">{targetLabel(p)}</td>
                      <td className="num tnum">
                        {used.toLocaleString("ko-KR")} / {issued > 0 ? issued.toLocaleString("ko-KR") : "—"}
                      </td>
                      <td>
                        <span className={`badge ${s.tone}`}>
                          <span className="bdot" />
                          {s.label}
                        </span>
                      </td>
                      <td>
                        <span className="kebab" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 || count > 0 ? (
          <div className="tablefoot">
            <span className="tf-info">
              {count.toLocaleString("ko-KR")}건 중 {page}/{totalPages} 페이지
            </span>
            <span className="spacer" />
            <div className="pager">
              <button
                type="button"
                className={`pg${page <= 1 ? " dis" : ""}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const n = start + i;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`pg${n === page ? " active" : ""}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                type="button"
                className={`pg${page >= totalPages ? " dis" : ""}`}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 쿠폰 상세 드로어 (DRAWERS.coupon) ─────────────────────────────────── */}
      <DetailDrawer
        open={!!detail}
        title={detail ? detail.code : "쿠폰"}
        sub="쿠폰 상세"
        status={
          detail ? (
            <span className={`badge ${STATUS[detail.status]?.tone ?? "neutral"}`}>
              <span className="bdot" />
              {STATUS[detail.status]?.label ?? detail.status}
            </span>
          ) : undefined
        }
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div className="danger-zone">
                {detail.status !== "inactive" ? (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busy}
                    onClick={() => setConfirmEnd(detail)}
                  >
                    즉시 종료
                  </button>
                ) : null}
              </div>
              <span className="spacer" />
              <button
                type="button"
                className="btn"
                onClick={() => setDetail(null)}
              >
                닫기
              </button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="dsec">
            <div className="dsec-t">쿠폰 정보</div>
            <dl className="kv">
              <dt>쿠폰명</dt>
              <dd>{detail.code}</dd>
              <dt>혜택</dt>
              <dd>{discountText(detail)}</dd>
              <dt>사용 대상</dt>
              <dd>{targetLabel(detail)}</dd>
              <dt>사용/발급</dt>
              <dd>
                {(detail.used ?? 0).toLocaleString("ko-KR")} /{" "}
                {detail.limit ? detail.limit.toLocaleString("ko-KR") : "—"}
              </dd>
              <dt>유효기간</dt>
              <dd>—</dd>
              <dt>적용 방식</dt>
              <dd>{detail.is_automatic ? "자동 적용" : "코드 입력"}</dd>
            </dl>
          </div>
        ) : null}
      </DetailDrawer>

      {/* ── 즉시 종료 확인 모달 (MISC.endCoupon) ──────────────────────────────── */}
      <ConfirmModal
        open={!!confirmEnd}
        title="쿠폰을 즉시 종료하시겠습니까?"
        message="발급된 쿠폰의 신규 사용이 중단됩니다."
        danger
        confirmText="즉시 종료"
        meta={{
          target:     confirmEnd?.code,
          effect:     "쿠폰 사용 중단",
          reversible: false,
        }}
        onConfirm={doEndCoupon}
        onCancel={() => setConfirmEnd(null)}
      />
    </div>
  );
}

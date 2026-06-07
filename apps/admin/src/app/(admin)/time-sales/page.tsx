"use client";

/**
 * 타임세일 운영 — d3 t009 (갭B, Medusa 코어 없음 → 커스텀 time-sale 모듈 래핑).
 *  · 목록: 상태(예정/진행중/종료) 뱃지 + 상태 필터 세그탭 + 페이지네이션.
 *  · 생성 드로어: 대상 상품 선택(listProducts) + 세일명 + 할인유형/값 + 기간(시작/종료) + 원가(선택).
 *  · 상세 드로어: 단건 필드 + 강제 종료(DELETE → status=ended, 원가 복원은 백엔드 job/service 담당).
 *  · 데이터·검증·상태판정은 모두 기존 /admin/time-sales route 호출(리플랫폼 원칙: FE 로직 재구현 금지).
 *  · 레이아웃/클래스(.scr · page-header · filterbar · card · dt · segtabs · badge)는 products/page.tsx 컨벤션 1:1 준수.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Search, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { listProducts, type ProductListItem } from "@/lib/api/products";
import {
  listTimeSales,
  createTimeSale,
  endTimeSale,
  SALE_STATUS_BADGE,
  discountText,
  type TimeSale,
  type SaleStatus,
  type DiscountType,
} from "@/lib/api/time-sales";

const PAGE_SIZE = 20;

/** 상태 필터 세그탭 — 전체 + scheduled/active/ended. */
const STATUS_TABS: { label: string; value: "" | SaleStatus }[] = [
  { label: "전체", value: "" },
  { label: "예정", value: "scheduled" },
  { label: "진행중", value: "active" },
  { label: "종료", value: "ended" },
];

function statusBadge(status: SaleStatus) {
  const s = SALE_STATUS_BADGE[status] ?? SALE_STATUS_BADGE.scheduled;
  return (
    <span className={`badge ${s.cls}`}>
      <span className="bdot" />
      {s.label}
    </span>
  );
}

/** ISO → KST 일시 표기(분 단위). */
function formatKstDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * datetime-local 입력값(로컬 시각, 초 없음) → ISO 문자열.
 * 빈 값은 빈 문자열 반환(백엔드 validateSale 에서 422 처리).
 */
function localToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** 생성 폼 초안. */
type SaleForm = {
  product_id: string;
  title: string;
  discount_type: DiscountType;
  discount_value: string;
  original_price: string;
  starts_at: string; // datetime-local
  ends_at: string; // datetime-local
};

const EMPTY_FORM: SaleForm = {
  product_id: "",
  title: "",
  discount_type: "percent",
  discount_value: "",
  original_price: "",
  starts_at: "",
  ends_at: "",
};

export default function TimeSalesPage() {
  const toast = useToast();

  /* ── 목록 상태 ── */
  const [sales, setSales] = useState<TimeSale[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | SaleStatus>("");
  const [loading, setLoading] = useState(true);

  /* ── 상세/종료 ── */
  const [detail, setDetail] = useState<TimeSale | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<TimeSale | null>(null);
  const [busy, setBusy] = useState(false);

  /* ── 생성 폼 ── */
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM);

  /* ── 상품 선택지(생성 폼 대상 상품) ── */
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productQ, setProductQ] = useState("");

  /* ============================================================
     데이터 로드
     ============================================================ */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTimeSales({
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setSales(res.time_sales);
      setCount(res.count);
    } catch (e) {
      toast.show(`타임세일 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── 생성 드로어 열릴 때 상품 목록 로드(대상 상품 선택용) ── */
  const loadProducts = useCallback(async (q: string) => {
    try {
      const res = await listProducts({ q: q || undefined, limit: 50, offset: 0 });
      setProducts(res.products);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (!creating) return;
    void loadProducts(productQ);
  }, [creating, productQ, loadProducts]);

  /* ============================================================
     생성
     ============================================================ */
  /** 폼 → 입력 검증(즉시 피드백용 — 권위 검증은 백엔드 validateSale). */
  function validateForm(): string | null {
    if (!form.product_id) return "대상 상품을 선택하세요.";
    if (!form.title.trim()) return "세일명을 입력하세요.";
    const v = Number(form.discount_value);
    if (!Number.isFinite(v) || v <= 0) return "할인값을 확인하세요(0보다 커야 합니다).";
    if (form.discount_type === "percent" && v > 100) return "할인율은 100 이하여야 합니다.";
    if (!form.starts_at || !form.ends_at) return "시작/종료 일시를 입력하세요.";
    if (new Date(form.starts_at).getTime() >= new Date(form.ends_at).getTime())
      return "종료 일시는 시작 일시보다 이후여야 합니다.";
    if (form.original_price.trim()) {
      const op = Number(form.original_price);
      if (!Number.isFinite(op) || op < 0) return "원가는 0 이상의 숫자여야 합니다.";
    }
    return null;
  }

  async function submitCreate() {
    const err = validateForm();
    if (err) {
      toast.show(err, "danger");
      return;
    }
    setBusy(true);
    try {
      const { time_sale } = await createTimeSale({
        product_id: form.product_id,
        title: form.title.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        original_price: form.original_price.trim() ? Number(form.original_price) : null,
        starts_at: localToIso(form.starts_at),
        ends_at: localToIso(form.ends_at),
      });
      toast.show(`'${time_sale.title}' 타임세일을 등록했습니다.`);
      setCreating(false);
      setForm(EMPTY_FORM);
      setProductQ("");
      setPage(1);
      await load();
    } catch (e) {
      toast.show(`타임세일 등록 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     강제 종료
     ============================================================ */
  async function doEnd(sale: TimeSale) {
    setConfirmEnd(null);
    setBusy(true);
    try {
      await endTimeSale(sale.id);
      toast.show(`'${sale.title}' 타임세일을 종료했습니다(원가 복원 대상).`);
      setDetail(null);
      await load();
    } catch (e) {
      toast.show(`종료 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     페이지네이션
     ============================================================ */
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const selectedProduct = products.find((p) => p.id === form.product_id) ?? null;

  /* ============================================================
     JSX
     ============================================================ */
  return (
    <div className="scr">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>타임세일</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}건 · 한정 기간 할인(예정 → 진행중 → 종료 시 원가 복원)
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setProductQ("");
              setCreating(true);
            }}
          >
            <Plus size={16} /> 타임세일 등록
          </button>
        </div>
      </div>

      {/* ② 카드 + 상태 세그탭 + 테이블 */}
      <div className="card" data-kind="time-sales">
        <div className="segtabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              className={`segtab${statusFilter === t.value ? " active" : ""}`}
              onClick={() => {
                setPage(1);
                setStatusFilter(t.value);
              }}
            >
              {t.label}
              {t.value === "" && <span className="cnt">{count.toLocaleString("ko-KR")}</span>}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty">
              <p>불러오는 중…</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="empty">
              <h4>타임세일이 없습니다</h4>
              <p>상단 ‘타임세일 등록’으로 한정 기간 할인을 만드세요.</p>
            </div>
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  <th>세일명</th>
                  <th>대상 상품</th>
                  <th className="num">할인</th>
                  <th>기간</th>
                  <th className="num">원가</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} onClick={() => setDetail(s)}>
                    <td>
                      <b>{s.title}</b>
                    </td>
                    <td className="muted">
                      <span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.product_id}</span>
                    </td>
                    <td className="num strong">{discountText(s)}</td>
                    <td className="muted">
                      {formatKstDateTime(s.starts_at)}
                      {" ~ "}
                      {formatKstDateTime(s.ends_at)}
                    </td>
                    <td className="num muted">
                      {s.original_price !== null ? formatCurrency(s.original_price) : "—"}
                    </td>
                    <td>{statusBadge(s.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {s.status !== "ended" ? (
                        <button
                          type="button"
                          className="btn sm danger"
                          disabled={busy}
                          onClick={() => setConfirmEnd(s)}
                        >
                          종료
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          원가 복원됨
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="tablefoot">
          <span className="tf-info">
            {count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} /{" "}
            {count.toLocaleString("ko-KR")}건
          </span>
          <span className="spacer" />
          <div className="pager">
            <button
              className={`pg${page <= 1 ? " dis" : ""}`}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  className={`pg${page === n ? " active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              );
            })}
            <button
              className={`pg${page >= totalPages ? " dis" : ""}`}
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════ 상세 드로어 ══════════════════════════ */}
      <DetailDrawer
        open={!!detail}
        title={detail ? detail.title : "타임세일 상세"}
        sub={detail ? `대상 상품: ${detail.product_id}` : undefined}
        status={detail ? statusBadge(detail.status) : undefined}
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <div style={{ display: "flex", width: "100%", gap: 8, alignItems: "center" }}>
              <div className="danger-zone">
                {detail.status !== "ended" && (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={busy}
                    onClick={() => setConfirmEnd(detail)}
                  >
                    타임세일 종료
                  </button>
                )}
              </div>
              <span className="spacer" />
              <button type="button" className="btn" onClick={() => setDetail(null)}>
                닫기
              </button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div>
            <div className="dsec">
              <div className="dsec-t">세일 정보</div>
              <div className="frow">
                <span className="field-l">대상 상품 ID</span>
                <input className="inp" value={detail.product_id} disabled />
              </div>
              <div className="frow">
                <span className="field-l">할인</span>
                <input
                  className="inp"
                  value={`${detail.discount_type === "percent" ? "할인율" : "할인금액"} · ${discountText(detail)}`}
                  disabled
                />
              </div>
              <div className="frow">
                <span className="field-l">원가 스냅샷</span>
                <input
                  className="inp"
                  value={detail.original_price !== null ? formatCurrency(detail.original_price) : "미지정"}
                  disabled
                />
              </div>
            </div>

            <div className="dsec">
              <div className="dsec-t">기간 · 상태</div>
              <div className="frow">
                <div className="fgrid2">
                  <div>
                    <span className="field-l">시작</span>
                    <input className="inp" value={formatKstDateTime(detail.starts_at)} disabled />
                  </div>
                  <div>
                    <span className="field-l">종료</span>
                    <input className="inp" value={formatKstDateTime(detail.ends_at)} disabled />
                  </div>
                </div>
              </div>
              <div className="frow">
                <span className="field-l">현재 상태</span>
                <div style={{ marginTop: 4 }}>{statusBadge(detail.status)}</div>
                {detail.status === "ended" && (
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
                    종료된 세일입니다. 원가 복원은 백엔드 스케줄 작업이 처리합니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      {/* ══════════════════════════ 등록 드로어 ══════════════════════════ */}
      <DetailDrawer
        open={creating}
        title="타임세일 등록"
        sub="한정 기간 할인을 예약합니다"
        onClose={() => setCreating(false)}
        footer={
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn" onClick={() => setCreating(false)}>
              취소
            </button>
            <button type="button" className="btn primary" disabled={busy} onClick={submitCreate}>
              <Zap size={15} /> 타임세일 등록
            </button>
          </div>
        }
      >
        <div>
          <div className="notice" style={{ marginBottom: 16 }}>
            시작 시각 도달 시 세일가가 자동 적용되고, 종료/소진 시 자동 종료되며 원가가 복원됩니다(백엔드 스케줄 처리).
          </div>

          {/* 대상 상품 */}
          <div className="dsec">
            <div className="dsec-t">대상 상품</div>
            <div className="frow">
              <span className="field-l">
                상품 검색 <span className="req">*</span>
              </span>
              <div className="search-input">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="상품명 · 상품코드로 검색"
                  value={productQ}
                  onChange={(e) => setProductQ(e.target.value)}
                />
              </div>
            </div>
            <div className="frow">
              <span className="field-l">상품 선택</span>
              <select
                className="inp select-like"
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              >
                <option value="">상품을 선택하세요</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.handle})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
                  선택: {selectedProduct.title} · ID {selectedProduct.id}
                </p>
              )}
            </div>
          </div>

          {/* 세일 정보 */}
          <div className="dsec">
            <div className="dsec-t">세일 정보</div>
            <div className="frow">
              <span className="field-l">
                세일명 <span className="req">*</span>
              </span>
              <input
                className="inp"
                value={form.title}
                placeholder="예) 주말 한정 타임세일"
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="frow">
              <span className="field-l">할인 유형</span>
              <div className="lang-tabs">
                {(
                  [
                    ["percent", "할인율(%)"],
                    ["fixed", "할인금액(원)"],
                  ] as const
                ).map(([val, label]) => (
                  <span
                    key={val}
                    className={`lang-tab${form.discount_type === val ? " active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, discount_type: val }))}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="frow">
              <div className="fgrid2">
                <div>
                  <span className="field-l">
                    {form.discount_type === "percent" ? "할인율(%)" : "할인금액(원)"}{" "}
                    <span className="req">*</span>
                  </span>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    style={{ textAlign: "right" }}
                    value={form.discount_value}
                    placeholder={form.discount_type === "percent" ? "예) 30" : "예) 5000"}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="field-l">원가(선택 · 복원 기준)</span>
                  <input
                    className="inp"
                    type="number"
                    min={0}
                    style={{ textAlign: "right" }}
                    value={form.original_price}
                    placeholder="₩ 원가 스냅샷"
                    onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 기간 */}
          <div className="dsec">
            <div className="dsec-t">기간</div>
            <div className="frow">
              <div className="fgrid2">
                <div>
                  <span className="field-l">
                    시작 일시 <span className="req">*</span>
                  </span>
                  <input
                    className="inp"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="field-l">
                    종료 일시 <span className="req">*</span>
                  </span>
                  <input
                    className="inp"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailDrawer>

      {/* ══════════════════════════ 종료 Confirm ══════════════════════════ */}
      <ConfirmModal
        open={!!confirmEnd}
        danger
        title="타임세일을 종료하시겠습니까?"
        message="즉시 종료되며 세일가가 해제됩니다. 원가 복원은 백엔드 스케줄 작업이 처리합니다."
        confirmText="타임세일 종료"
        meta={
          confirmEnd
            ? {
                target: confirmEnd.title,
                effect: "상태 → 종료 (원가 복원 대상)",
                reversible: false,
              }
            : undefined
        }
        onConfirm={() => confirmEnd && doEnd(confirmEnd)}
        onCancel={() => setConfirmEnd(null)}
      />
    </div>
  );
}

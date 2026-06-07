"use client";

/**
 * 창고 관리 — Medusa /admin/stock-locations 호출/래핑(로직 복사 X).
 *  ① pageHeader(창고 등록)
 *  ② card: table(창고명·주소·생성일·액션) + 등록/수정 모달
 *  ③ 창고 삭제 confirm
 *
 * members/page.tsx 및 customer-groups/page.tsx UI 패턴(page-header, card, dt, 토스트) 정합.
 * 재고 아이템은 상품 관리 화면에서 창고 위치와 연결.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Warehouse as WarehouseIcon, Pencil, Trash2 } from "lucide-react";
import { EmptyState, LoadingSkeleton } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  type Warehouse,
  type CreateWarehouseInput,
} from "@/lib/api/warehouse";

/* ── 유틸 ─────────────────────────────────────────────── */

function formatKst(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

function addressLine(w: Warehouse): string {
  const a = w.address;
  if (!a) return "—";
  const parts = [a.address_1, a.city, a.province, a.postal_code, a.country_code?.toUpperCase()]
    .filter(Boolean);
  return parts.join(", ") || "—";
}

/* ── 창고 폼 초기값 ─────────────────────────────────────── */

type WarehouseFormData = {
  name: string;
  address_1: string;
  city: string;
  country_code: string;
  phone: string;
  postal_code: string;
};

const EMPTY_FORM: WarehouseFormData = {
  name: "",
  address_1: "",
  city: "",
  country_code: "KR",
  phone: "",
  postal_code: "",
};

function formToInput(f: WarehouseFormData): CreateWarehouseInput {
  const input: CreateWarehouseInput = { name: f.name };
  const hasAddress = f.address_1 || f.city || f.phone || f.postal_code;
  if (hasAddress) {
    input.address = {
      address_1: f.address_1 || undefined,
      city: f.city || undefined,
      country_code: f.country_code || "KR",
      phone: f.phone || undefined,
      postal_code: f.postal_code || undefined,
    };
  }
  return input;
}

/* ── 페이지 루트 ─────────────────────────────────────── */

export default function WarehousePage() {
  return <WarehouseScreen />;
}

/* ── 메인 화면 ─────────────────────────────────────────── */

function WarehouseScreen() {
  const [rows, setRows] = useState<Warehouse[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 검색어(클라이언트 측 필터 — Medusa stock-locations q 미지원)
  const [q, setQ] = useState("");

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 삭제 confirm
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  /* ── 토스트 ── */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  /* ── 데이터 로드 ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listWarehouses({ limit: 100 });
      setRows(res.stock_locations);
      setCount(res.count);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── 클라이언트 검색 필터 ── */
  const filteredRows = q.trim()
    ? rows.filter((r) =>
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        addressLine(r).toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  /* ── 모달 열기(생성) ── */
  function openCreateModal() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  /* ── 모달 열기(수정) ── */
  function openEditModal(w: Warehouse) {
    setEditTarget(w);
    setForm({
      name: w.name,
      address_1: w.address?.address_1 ?? "",
      city: w.address?.city ?? "",
      country_code: w.address?.country_code ?? "KR",
      phone: w.address?.phone ?? "",
      postal_code: w.address?.postal_code ?? "",
    });
    setModalOpen(true);
  }

  /* ── 폼 제출(생성 / 수정) ── */
  async function submitForm() {
    const name = form.name.trim();
    if (!name) {
      showToast("창고명을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const input = formToInput({ ...form, name });
      if (editTarget) {
        await updateWarehouse(editTarget.id, input);
        showToast("창고 정보를 수정했습니다.");
      } else {
        await createWarehouse(input);
        showToast("창고를 등록했습니다.");
      }
      setModalOpen(false);
      await load();
    } catch {
      showToast(editTarget ? "창고 수정에 실패했습니다." : "창고 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── 창고 삭제 ── */
  async function handleDelete(w: Warehouse) {
    setDeleting(true);
    try {
      await deleteWarehouse(w.id);
      showToast(`${w.name} 창고를 삭제했습니다.`);
      setDeleteTarget(null);
      await load();
    } catch {
      showToast("창고 삭제에 실패했습니다. 재고 아이템과 연결된 창고는 삭제할 수 없습니다.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="scr">
      {/* ① pageHeader */}
      <div className="page-header">
        <div className="ph-l">
          <h1>창고 관리</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}개 · 재고 아이템의 보관 위치(물류 창고) 관리
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn primary" type="button" onClick={openCreateModal}>
            <Plus size={16} />
            창고 등록
          </button>
        </div>
      </div>

      {/* filterBar */}
      <div className="filterbar">
        <div className="search-input">
          <Search size={15} />
          <input
            type="text"
            placeholder="창고명·주소 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => setQ("")}>
          초기화
        </button>
      </div>

      {/* ② card: 창고 목록 */}
      <div className="card" data-kind="warehouse">
        {loading ? (
          <div style={{ padding: "16px" }}>
            <LoadingSkeleton rows={5} />
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={<WarehouseIcon size={26} />}
            title={q ? "검색 결과가 없습니다" : "등록된 창고가 없습니다"}
            description={q ? "다른 검색어를 입력해 보세요." : "재고를 보관할 창고(물류 위치)를 등록해 주세요."}
            action={
              !q ? (
                <button className="btn primary" type="button" onClick={openCreateModal}>
                  <Plus size={16} />
                  창고 등록
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>창고명</th>
                  <th>주소</th>
                  <th>연락처</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((w) => (
                  <tr key={w.id}>
                    <td className="strong">{w.name}</td>
                    <td className="muted" style={{ fontSize: "12px" }}>{addressLine(w)}</td>
                    <td className="muted" style={{ fontSize: "12px" }}>{w.address?.phone ?? "—"}</td>
                    <td className="muted">{formatKst(w.created_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn sm icon"
                          type="button"
                          aria-label="수정"
                          onClick={() => openEditModal(w)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn sm icon danger"
                          type="button"
                          aria-label="삭제"
                          onClick={() => setDeleteTarget(w)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 창고 등록/수정 모달 */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded bg-surface p-5 shadow-lg"
          >
            <h3 className="text-base font-bold text-text">
              {editTarget ? "창고 수정" : "창고 등록"}
            </h3>
            <p className="mt-1.5 text-sm text-text-2">
              {editTarget
                ? "창고 정보를 수정합니다."
                : "새 창고(재고 보관 위치)를 등록합니다."}
            </p>

            <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* 창고명 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="wh-name">
                  창고명 <span style={{ color: "var(--danger, #e11d48)" }}>*</span>
                </label>
                <input
                  id="wh-name"
                  type="text"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="예: 서울 본사 창고"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* 주소 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="wh-addr">
                  주소
                </label>
                <input
                  id="wh-addr"
                  type="text"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  value={form.address_1}
                  onChange={(e) => setForm((f) => ({ ...f, address_1: e.target.value }))}
                />
              </div>

              {/* 도시 + 우편번호 */}
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="wh-city">
                    시·도
                  </label>
                  <input
                    id="wh-city"
                    type="text"
                    className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="예: 서울"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div style={{ flex: "0 0 120px" }}>
                  <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="wh-postal">
                    우편번호
                  </label>
                  <input
                    id="wh-postal"
                    type="text"
                    className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                    placeholder="12345"
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="wh-phone">
                  연락처
                </label>
                <input
                  id="wh-phone"
                  type="tel"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="예: 02-1234-5678"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => void submitForm()}
                disabled={submitting}
              >
                {submitting ? (editTarget ? "수정 중…" : "등록 중…") : (editTarget ? "수정" : "등록")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ③ 창고 삭제 confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        danger
        title="창고를 삭제하시겠습니까?"
        message="재고 아이템과 연결된 창고는 삭제할 수 없습니다. 연결을 먼저 해제해 주세요."
        confirmText={deleting ? "삭제 중…" : "삭제"}
        meta={{
          target: deleteTarget ? deleteTarget.name : undefined,
          effect: "재고 위치 정보 영구 삭제",
          reversible: false,
        }}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
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

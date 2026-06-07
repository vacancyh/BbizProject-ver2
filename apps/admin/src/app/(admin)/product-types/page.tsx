"use client";

/**
 * 상품 분류 체계(상품군/유형/분류) — 한국형 product-type 모듈 관리 화면.
 *  - 분야(상품군) → 분류(유형) 2계층 + 분류별 옵션 템플릿 + 고시 필수항목(전자상거래법 상품정보제공고시).
 *  - 전부 /admin/product-types(+ /:id) 호출/래핑. Medusa 진열 카테고리와 별개 축.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  PageHeader,
  ConfirmModal,
  DetailDrawer,
  LoadingSkeleton,
  EmptyState,
  useToast,
} from "@/components/ui";
import {
  getProductTypes,
  createProductType,
  deleteProductType,
  addOption,
  addDisclosureField,
  type ProductTypeNode,
} from "@/lib/api/product-types";

export default function ProductTypesPage() {
  const toast = useToast();
  const [tree, setTree] = useState<ProductTypeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ProductTypeNode | null>(null);

  // 생성 폼
  const [createMode, setCreateMode] = useState<null | "field" | "category">(null);
  const [form, setForm] = useState({ name: "", parent_id: "", disclosure_code: "" });

  // 인라인 추가(분류 id → 입력값)
  const [optDraft, setOptDraft] = useState<Record<string, { title: string; values: string }>>({});
  const [fieldDraft, setFieldDraft] = useState<Record<string, { key: string; label: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { product_types } = await getProductTypes();
      setTree(product_types);
    } catch (e) {
      toast.show(`분류 체계 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const fields = tree; // 분야(top)

  async function submitCreate() {
    if (!form.name.trim()) {
      toast.show("이름을 입력하세요.", "danger");
      return;
    }
    if (createMode === "category" && !form.parent_id) {
      toast.show("상위 분야를 선택하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await createProductType({
        name: form.name.trim(),
        parent_id: createMode === "category" ? form.parent_id : null,
        disclosure_code: form.disclosure_code.trim() || undefined,
      });
      toast.show(`${createMode === "field" ? "분야" : "분류"} '${form.name.trim()}'을(를) 추가했습니다.`);
      setCreateMode(null);
      setForm({ name: "", parent_id: "", disclosure_code: "" });
      await load();
    } catch (e) {
      toast.show(`추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete(node: ProductTypeNode) {
    setConfirmDel(null);
    setBusy(true);
    try {
      await deleteProductType(node.id);
      toast.show(`'${node.name}'을(를) 삭제했습니다.`);
      await load();
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function submitOption(typeId: string) {
    const d = optDraft[typeId];
    if (!d?.title?.trim() || !d?.values?.trim()) {
      toast.show("옵션명과 값(쉼표 구분)을 입력하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await addOption(typeId, d.title.trim(), d.values.split(",").map((v) => v.trim()).filter(Boolean));
      setOptDraft((s) => ({ ...s, [typeId]: { title: "", values: "" } }));
      toast.show("옵션 템플릿을 추가했습니다.");
      await load();
    } catch (e) {
      toast.show(`옵션 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function submitField(typeId: string) {
    const d = fieldDraft[typeId];
    if (!d?.key?.trim() || !d?.label?.trim()) {
      toast.show("항목 키와 라벨을 입력하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await addDisclosureField(typeId, d.key.trim(), d.label.trim(), true);
      setFieldDraft((s) => ({ ...s, [typeId]: { key: "", label: "" } }));
      toast.show("고시 필수항목을 추가했습니다.");
      await load();
    } catch (e) {
      toast.show(`고시 항목 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  function renderCategory(c: ProductTypeNode) {
    const open = expanded[c.id];
    return (
      <div key={c.id} className="rounded-sm border border-border">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" onClick={() => setExpanded((s) => ({ ...s, [c.id]: !s[c.id] }))} className="text-text-3 hover:text-text">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="font-medium text-text">{c.name}</span>
          {c.disclosure_code ? <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] text-text-2">고시코드 {c.disclosure_code}</span> : null}
          <span className="text-xs text-text-3">옵션 {c.options.length} · 고시 {c.disclosure_fields.length}</span>
          <button type="button" className="ml-auto text-text-3 hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => setConfirmDel(c)} aria-label="분류 삭제">
            <Trash2 size={14} />
          </button>
        </div>

        {open ? (
          <div className="space-y-3 border-t border-border bg-surface-2 px-3 py-3">
            {/* 옵션 템플릿 */}
            <div>
              <div className="mb-1.5 text-xs font-bold text-text-2">옵션 템플릿</div>
              <div className="flex flex-wrap gap-1.5">
                {c.options.length ? (
                  c.options.map((o, i) => (
                    <span key={i} className="rounded-sm border border-border bg-surface px-2 py-1 text-xs">
                      <b className="text-text">{o.option_title}</b>
                      <span className="text-text-3"> : {(Array.isArray(o.option_values) ? o.option_values : []).join(", ")}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-text-3">옵션 없음</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-xs outline-none focus:border-primary"
                  placeholder="옵션명(예: 사이즈)"
                  value={optDraft[c.id]?.title ?? ""}
                  onChange={(e) => setOptDraft((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? { title: "", values: "" }), title: e.target.value } }))}
                />
                <input
                  className="h-8 flex-1 rounded-sm border border-border bg-surface px-2 text-xs outline-none focus:border-primary"
                  placeholder="값(쉼표 구분: S,M,L,XL)"
                  value={optDraft[c.id]?.values ?? ""}
                  onChange={(e) => setOptDraft((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? { title: "", values: "" }), values: e.target.value } }))}
                />
                <button type="button" className="rounded-sm border border-border bg-surface px-2 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40" disabled={busy} onClick={() => submitOption(c.id)}>
                  옵션 추가
                </button>
              </div>
            </div>

            {/* 고시 필수항목 */}
            <div>
              <div className="mb-1.5 text-xs font-bold text-text-2">고시 필수항목(상품정보제공고시)</div>
              <div className="flex flex-wrap gap-1.5">
                {c.disclosure_fields.length ? (
                  c.disclosure_fields.map((f, i) => (
                    <span key={i} className="rounded-sm border border-border bg-surface px-2 py-1 text-xs text-text">
                      {f.label}
                      {f.required ? <span className="text-danger"> *</span> : null}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-text-3">고시 항목 없음</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  className="h-8 w-28 rounded-sm border border-border bg-surface px-2 text-xs outline-none focus:border-primary"
                  placeholder="키(예: material)"
                  value={fieldDraft[c.id]?.key ?? ""}
                  onChange={(e) => setFieldDraft((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? { key: "", label: "" }), key: e.target.value } }))}
                />
                <input
                  className="h-8 flex-1 rounded-sm border border-border bg-surface px-2 text-xs outline-none focus:border-primary"
                  placeholder="라벨(예: 제품 소재)"
                  value={fieldDraft[c.id]?.label ?? ""}
                  onChange={(e) => setFieldDraft((s) => ({ ...s, [c.id]: { ...(s[c.id] ?? { key: "", label: "" }), label: e.target.value } }))}
                />
                <button type="button" className="rounded-sm border border-border bg-surface px-2 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40" disabled={busy} onClick={() => submitField(c.id)}>
                  고시 추가
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="상품 분류 체계"
        sub="상품군(분야) → 분류(유형) + 옵션 템플릿 + 고시 필수항목 · Medusa 진열 카테고리와 별개 축(상품정보제공고시 기반)"
        gap="B"
        actions={
          <>
            <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setCreateMode("field")}>
              <Plus size={14} className="mr-1 inline" /> 분야 추가
            </button>
            <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press" onClick={() => setCreateMode("category")}>
              <Plus size={14} className="mr-1 inline" /> 분류 추가
            </button>
          </>
        }
      />

      {loading ? (
        <div className="rounded bg-surface p-4 shadow-xs">
          <LoadingSkeleton rows={6} />
        </div>
      ) : !fields.length ? (
        <div className="rounded bg-surface shadow-xs">
          <EmptyState icon={<Layers />} title="분류 체계가 없습니다" description="‘분야 추가’로 상품군을 먼저 만드세요." />
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((f) => (
            <section key={f.id} className="rounded bg-surface p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-base font-extrabold text-text">{f.name}</h2>
                <span className="rounded-pill bg-info-weak px-2 py-0.5 text-[11px] font-bold text-info">분야(상품군)</span>
                <span className="text-xs text-text-3">분류 {f.children?.length ?? 0}개</span>
                <button type="button" className="ml-auto text-text-3 hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => setConfirmDel(f)} aria-label="분야 삭제">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="space-y-2">
                {(f.children ?? []).length ? (f.children ?? []).map(renderCategory) : <p className="text-sm text-text-3">하위 분류가 없습니다. ‘분류 추가’로 추가하세요.</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 분야/분류 생성 */}
      <DetailDrawer
        open={!!createMode}
        title={createMode === "field" ? "분야(상품군) 추가" : "분류(유형) 추가"}
        sub={createMode === "field" ? "최상위 판매 분야를 만듭니다(예: 의류, 가전)." : "분야 하위 분류를 만듭니다(예: 상의, 벨트)."}
        onClose={() => setCreateMode(null)}
        footer={
          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setCreateMode(null)}>
              취소
            </button>
            <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy} onClick={submitCreate}>
              추가
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          {createMode === "category" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-2">상위 분야 <span className="text-danger">*</span></span>
              <select className="h-9 w-full rounded-sm border border-border bg-surface px-2 outline-none focus:border-primary" value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
                <option value="">분야 선택</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-2">이름 <span className="text-danger">*</span></span>
            <input className="h-9 w-full rounded-sm border border-border bg-surface px-2.5 outline-none focus:border-primary" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={createMode === "field" ? "예) 의류" : "예) 아우터"} />
          </label>
          {createMode === "category" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-2">고시 코드(선택)</span>
              <input className="h-9 w-full rounded-sm border border-border bg-surface px-2.5 outline-none focus:border-primary" value={form.disclosure_code} onChange={(e) => setForm((f) => ({ ...f, disclosure_code: e.target.value }))} placeholder="예) clothing" />
            </label>
          ) : null}
        </div>
      </DetailDrawer>

      <ConfirmModal
        open={!!confirmDel}
        danger
        title={`'${confirmDel?.name}'을(를) 삭제하시겠습니까?`}
        message="해당 분야/분류와 소속 옵션 템플릿·고시 필수항목이 함께 삭제됩니다."
        confirmText="삭제"
        meta={confirmDel ? { target: confirmDel.name, effect: "분류 + 옵션 + 고시 삭제", reversible: false } : undefined}
        onConfirm={() => confirmDel && doDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

// EmptyState 아이콘용
function Layers() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>;
}

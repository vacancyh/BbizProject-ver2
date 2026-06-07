"use client";

/**
 * 카테고리 도메인 — 진열 카테고리 / 컬렉션·기획전 / 상품 태그 (3탭).
 *  - 전부 Medusa REST 호출/래핑(로직 복사 X): product-categories / collections / product-tags.
 *  - 카테고리 = 스토어프론트 진열 축(계층/순서/노출). 상품 분류 체계(상품군/유형)와 별개.
 *  - 컬렉션·태그 = GAP_A(메두사 有·우리 자리 신설). 홈 큐레이션 연계 자리.
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, X, FolderTree, Trash2, Search } from "lucide-react";
import {
  PageHeader,
  DataTable,
  DetailDrawer,
  ConfirmModal,
  EmptyState,
  useToast,
  type Column,
} from "@/components/ui";
import {
  listCategoryTree,
  listCategoriesFlat,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryProducts,
  type Category,
} from "@/lib/api/categories";
import {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  updateCollectionProducts,
  type Collection,
} from "@/lib/api/collections";
import { listTags, createTag, updateTag, deleteTag, type ProductTag } from "@/lib/api/tags";
import { listProducts, type ProductListItem } from "@/lib/api/products";
import { validateSlug } from "@/lib/catalog/slug-logic";
import {
  listCategoryOptionMaps,
  createCategoryOptionMap,
  deleteCategoryOptionMap,
  type CategoryOptionMap,
} from "@/lib/api/category-option-map";
import { getProductTypes, type ProductTypeNode } from "@/lib/api/product-types";

type Tab = "categories" | "collections" | "tags" | "option-map";

const TABS: { id: Tab; label: string; gap?: "A" | "B" | null }[] = [
  { id: "categories", label: "진열 카테고리", gap: null },
  { id: "collections", label: "컬렉션 · 기획전", gap: "A" },
  { id: "tags", label: "상품 태그", gap: "A" },
  { id: "option-map", label: "카테고리별 옵션 매핑", gap: "A" },
];

export default function CategoriesPage() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div>
      <PageHeader
        title="카테고리"
        sub="진열 카테고리(계층/순서/노출) · 컬렉션/기획전 · 상품 태그"
        gap="A"
      />
      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-2"
            }`}
          >
            {t.label}
            {t.gap === "A" ? <span className="ml-1 text-[10px] font-normal text-text-3">(신설)</span> : null}
          </button>
        ))}
      </div>

      {tab === "categories" ? <CategoriesTab /> : null}
      {tab === "collections" ? <CollectionsTab /> : null}
      {tab === "tags" ? <TagsTab /> : null}
      {tab === "option-map" ? <CategoryOptionMapTab /> : null}
    </div>
  );
}

/* ─────────────────────────── 진열 카테고리 ─────────────────────────── */

function CategoriesTab() {
  const toast = useToast();
  const [tree, setTree] = useState<Category[]>([]);
  const [flat, setFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", parent_category_id: "", is_active: true, is_internal: false });

  const [detail, setDetail] = useState<(Category & { products?: { id: string; title: string; thumbnail: string | null }[] }) | null>(null);
  const [edit, setEdit] = useState({ name: "", handle: "", description: "", is_active: true, rank: 0 });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Category | null>(null);

  // 상품 연결 검색
  const [pq, setPq] = useState("");
  const [presults, setPresults] = useState<ProductListItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, f] = await Promise.all([listCategoryTree(), listCategoriesFlat()]);
      setTree(t.product_categories);
      setFlat(f.product_categories);
    } catch (e) {
      toast.show(`카테고리 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitCreate() {
    if (!form.name.trim()) {
      toast.show("카테고리명을 입력하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await createCategory({
        name: form.name.trim(),
        parent_category_id: form.parent_category_id || null,
        is_active: form.is_active,
        is_internal: form.is_internal,
      });
      toast.show(`'${form.name.trim()}' 카테고리를 생성했습니다.`);
      setCreating(false);
      setForm({ name: "", parent_category_id: "", is_active: true, is_internal: false });
      await load();
    } catch (e) {
      toast.show(`생성 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(c: Category) {
    setDetail(null);
    try {
      const { product_category } = await getCategory(c.id);
      setDetail(product_category);
      setEdit({
        name: product_category.name ?? "",
        handle: product_category.handle ?? "",
        description: product_category.description ?? "",
        is_active: product_category.is_active,
        rank: product_category.rank ?? 0,
      });
      setPq("");
      setPresults([]);
    } catch (e) {
      toast.show(`상세 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  async function reloadDetail(id: string) {
    const { product_category } = await getCategory(id);
    setDetail(product_category);
    await load();
  }

  async function saveEdit() {
    if (!detail) return;
    if (!edit.name.trim() || !edit.handle.trim()) {
      toast.show("이름과 slug(handle)는 필수입니다.", "danger");
      return;
    }
    // slug 형식 검증(t006 UT-001) — 위반 시 저장 차단
    const slugCheck = validateSlug(edit.handle.trim());
    if (!slugCheck.valid) {
      toast.show(`slug 오류: ${slugCheck.errors.join(", ")}`, "danger");
      return;
    }
    setBusy(true);
    try {
      await updateCategory(detail.id, {
        name: edit.name.trim(),
        handle: edit.handle.trim(),
        description: edit.description.trim() || null,
        is_active: edit.is_active,
        rank: Number(edit.rank) || 0,
      });
      await reloadDetail(detail.id);
      toast.show("카테고리를 저장했습니다.");
    } catch (e) {
      toast.show(`저장 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await deleteCategory(confirmDel.id);
      toast.show("카테고리를 삭제했습니다.");
      setConfirmDel(null);
      if (detail?.id === confirmDel.id) setDetail(null);
      await load();
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function searchProducts() {
    try {
      const { products } = await listProducts({ q: pq || undefined, limit: 8 });
      const linked = new Set((detail?.products ?? []).map((p) => p.id));
      setPresults(products.filter((p) => !linked.has(p.id)));
    } catch (e) {
      toast.show(`상품 검색 실패: ${(e as Error).message}`, "danger");
    }
  }

  async function linkProduct(productId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await updateCategoryProducts(detail.id, { add: [productId] });
      await reloadDetail(detail.id);
      setPresults((r) => r.filter((p) => p.id !== productId));
      toast.show("상품을 연결했습니다.");
    } catch (e) {
      toast.show(`연결 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProduct(productId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await updateCategoryProducts(detail.id, { remove: [productId] });
      await reloadDetail(detail.id);
      toast.show("상품 연결을 해제했습니다.");
    } catch (e) {
      toast.show(`해제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press"
          onClick={() => setCreating(true)}
        >
          <Plus size={15} /> 카테고리 추가
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-text-3">불러오는 중…</div>
      ) : tree.length === 0 ? (
        <EmptyState icon={<FolderTree size={26} />} title="카테고리가 없습니다" description="첫 진열 카테고리를 추가해 주세요." />
      ) : (
        <div className="space-y-2">
          {tree.map((root) => (
            <div key={root.id} className="rounded bg-surface p-3 shadow-xs">
              <CategoryRow c={root} onClick={() => openDetail(root)} onDelete={() => setConfirmDel(root)} />
              {(root.category_children ?? []).length ? (
                <div className="mt-2 space-y-1 border-l-2 border-border pl-4">
                  {(root.category_children ?? [])
                    .slice()
                    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
                    .map((child) => (
                      <CategoryRow key={child.id} c={child} child onClick={() => openDetail(child)} onDelete={() => setConfirmDel(child)} />
                    ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 추가 */}
      <DetailDrawer open={creating} title="카테고리 추가" sub="진열 카테고리(스토어프론트 노출)" onClose={() => setCreating(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setCreating(false)}>취소</button>
            <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy} onClick={submitCreate}>생성</button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <LabeledInput label="카테고리명" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-2">상위 카테고리</span>
            <select className="h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary" value={form.parent_category_id} onChange={(e) => setForm((f) => ({ ...f, parent_category_id: e.target.value }))}>
              <option value="">최상위(루트)</option>
              {flat.filter((c) => !c.parent_category_id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            <span className="text-text-2">활성(스토어프론트 노출)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_internal} onChange={(e) => setForm((f) => ({ ...f, is_internal: e.target.checked }))} />
            <span className="text-text-2">내부용(노출 제외)</span>
          </label>
        </div>
      </DetailDrawer>

      {/* 카테고리 상세/편집 */}
      <DetailDrawer
        open={!!detail}
        wide
        title={detail ? detail.name : "카테고리"}
        sub={detail ? detail.handle : undefined}
        status={detail ? <ActiveBadge active={detail.is_active} /> : undefined}
        onClose={() => setDetail(null)}
        footer={
          detail ? (
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center gap-1 rounded-sm border border-danger/40 bg-danger-weak px-3 py-2 text-sm font-bold text-danger hover:bg-danger hover:text-white disabled:opacity-40" disabled={busy} onClick={() => setConfirmDel(detail)}>
                <Trash2 size={14} /> 삭제
              </button>
              <span className="flex-1" />
              <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setDetail(null)}>닫기</button>
              <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy} onClick={saveEdit}>저장</button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-5 text-sm">
            <section className="space-y-3 rounded-sm bg-surface-2 p-3">
              <LabeledInput label="카테고리명" value={edit.name} onChange={(v) => setEdit((s) => ({ ...s, name: v }))} />
              <LabeledInput label="slug(handle)" value={edit.handle} onChange={(v) => setEdit((s) => ({ ...s, handle: v }))} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-text-2">설명</span>
                <textarea className="w-full rounded-sm border border-border bg-surface p-2 text-sm outline-none focus:border-primary" rows={2} value={edit.description} onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))} />
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit((s) => ({ ...s, is_active: e.target.checked }))} />
                  <span className="text-text-2">활성(노출)</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-text-2">정렬 순서(rank)</span>
                  <input type="number" className="h-8 w-20 rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary" value={edit.rank} onChange={(e) => setEdit((s) => ({ ...s, rank: Number(e.target.value) }))} />
                </label>
              </div>
            </section>

            {/* 연결 상품 */}
            <section>
              <h4 className="mb-2 font-bold text-text">연결 상품 {detail.products?.length ?? 0}개</h4>
              <div className="space-y-1.5">
                {(detail.products ?? []).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="h-7 w-7 rounded-sm object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-sm bg-surface-2" />
                    )}
                    <span className="flex-1 text-text">{p.title}</span>
                    <button type="button" className="text-text-3 hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => unlinkProduct(p.id)} aria-label="연결 해제">
                      <X size={15} />
                    </button>
                  </div>
                ))}
                {(detail.products ?? []).length === 0 ? <p className="text-xs text-text-3">연결된 상품이 없습니다.</p> : null}
              </div>

              <div className="mt-3 rounded-sm bg-surface-2 p-2.5">
                <div className="flex items-center gap-2">
                  <input className="h-9 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary" placeholder="상품명 검색 후 연결" value={pq} onChange={(e) => setPq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchProducts(); }} />
                  <button type="button" className="flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={searchProducts}>
                    <Search size={14} /> 검색
                  </button>
                </div>
                {presults.length ? (
                  <div className="mt-2 space-y-1">
                    {presults.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded-sm bg-surface px-2.5 py-1.5">
                        <span className="flex-1 text-text">{p.title}</span>
                        <button type="button" className="rounded-sm border border-border px-2 py-1 text-xs font-bold hover:bg-surface-2 disabled:opacity-40" disabled={busy} onClick={() => linkProduct(p.id)}>연결</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal
        open={!!confirmDel}
        title="카테고리를 삭제할까요?"
        message={confirmDel ? `'${confirmDel.name}' 카테고리를 삭제합니다. 하위/상품 연결은 해제됩니다.` : undefined}
        danger
        confirmText="삭제"
        meta={{ target: confirmDel?.name, reversible: false }}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

function CategoryRow({ c, child, onClick, onDelete }: { c: Category; child?: boolean; onClick: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={onClick}>
        <FolderTree size={child ? 14 : 16} className={child ? "text-text-3" : "text-primary"} />
        <span className={child ? "text-sm text-text-2" : "font-bold text-text"}>{c.name}</span>
        <span className="text-xs text-text-3">/{c.handle}</span>
        <ActiveBadge active={c.is_active} />
      </button>
      <button type="button" className="text-text-3 hover:text-danger" onClick={onDelete} aria-label="삭제">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-pill px-2 py-0.5 text-[11px] font-bold ${active ? "bg-success-weak text-success" : "bg-surface-2 text-text-3"}`}>
      {active ? "노출" : "숨김"}
    </span>
  );
}

/* ─────────────────────────── 컬렉션 / 기획전 ─────────────────────────── */

function CollectionsTab() {
  const toast = useToast();
  const [rows, setRows] = useState<(Collection & { products?: { id: string }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const [detail, setDetail] = useState<Collection | null>(null);
  const [edit, setEdit] = useState({ title: "", handle: "" });
  const [confirmDel, setConfirmDel] = useState<Collection | null>(null);
  const [pq, setPq] = useState("");
  const [presults, setPresults] = useState<ProductListItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { collections } = await listCollections({ limit: 50 });
      setRows(collections);
    } catch (e) {
      toast.show(`컬렉션 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitCreate() {
    if (!title.trim()) {
      toast.show("컬렉션 제목을 입력하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await createCollection({ title: title.trim() });
      toast.show(`'${title.trim()}' 컬렉션을 생성했습니다.`);
      setCreating(false);
      setTitle("");
      await load();
    } catch (e) {
      toast.show(`생성 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(c: Collection) {
    setDetail(null);
    try {
      const { collection } = await getCollection(c.id);
      setDetail(collection);
      setEdit({ title: collection.title ?? "", handle: collection.handle ?? "" });
      setPq("");
      setPresults([]);
    } catch (e) {
      toast.show(`상세 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  async function reloadDetail(id: string) {
    const { collection } = await getCollection(id);
    setDetail(collection);
    await load();
  }

  async function saveEdit() {
    if (!detail) return;
    if (!edit.title.trim() || !edit.handle.trim()) {
      toast.show("제목과 slug(handle)는 필수입니다.", "danger");
      return;
    }
    // slug 형식 검증(t006 UT-001) — 위반 시 저장 차단
    const slugCheck = validateSlug(edit.handle.trim());
    if (!slugCheck.valid) {
      toast.show(`slug 오류: ${slugCheck.errors.join(", ")}`, "danger");
      return;
    }
    setBusy(true);
    try {
      await updateCollection(detail.id, { title: edit.title.trim(), handle: edit.handle.trim() });
      await reloadDetail(detail.id);
      toast.show("컬렉션을 저장했습니다.");
    } catch (e) {
      toast.show(`저장 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await deleteCollection(confirmDel.id);
      toast.show("컬렉션을 삭제했습니다.");
      setConfirmDel(null);
      if (detail?.id === confirmDel.id) setDetail(null);
      await load();
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function searchProducts() {
    try {
      const { products } = await listProducts({ q: pq || undefined, limit: 8 });
      const linked = new Set((detail?.products ?? []).map((p) => p.id));
      setPresults(products.filter((p) => !linked.has(p.id)));
    } catch (e) {
      toast.show(`상품 검색 실패: ${(e as Error).message}`, "danger");
    }
  }

  async function linkProduct(productId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await updateCollectionProducts(detail.id, { add: [productId] });
      await reloadDetail(detail.id);
      setPresults((r) => r.filter((p) => p.id !== productId));
      toast.show("상품을 추가했습니다.");
    } catch (e) {
      toast.show(`추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProduct(productId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await updateCollectionProducts(detail.id, { remove: [productId] });
      await reloadDetail(detail.id);
      toast.show("상품을 제외했습니다.");
    } catch (e) {
      toast.show(`제외 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Collection & { products?: { id: string }[] }>[] = [
    { header: "컬렉션", cell: (c) => <span className="font-medium text-text">{c.title}</span> },
    { header: "slug", cell: (c) => <span className="text-xs text-text-3">/{c.handle}</span> },
    { header: "연결 상품", numeric: true, cell: (c) => <span className="text-text-2">{(c.products ?? []).length}개</span> },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press" onClick={() => setCreating(true)}>
          <Plus size={15} /> 컬렉션 추가
        </button>
      </div>

      <DataTable columns={columns} data={rows} rowKey={(c) => c.id} loading={loading} emptyTitle="컬렉션이 없습니다" onRowClick={openDetail} />

      {/* 생성 */}
      <DetailDrawer open={creating} title="컬렉션 추가" sub="기획전/큐레이션 묶음" onClose={() => setCreating(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setCreating(false)}>취소</button>
            <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy} onClick={submitCreate}>생성</button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <LabeledInput label="컬렉션 제목" value={title} onChange={setTitle} />
          <p className="text-xs text-text-3">slug는 제목에서 자동 생성됩니다(한글이면 임시코드). 생성 후 편집 가능.</p>
        </div>
      </DetailDrawer>

      {/* 상세/편집 */}
      <DetailDrawer open={!!detail} wide title={detail ? detail.title : "컬렉션"} sub={detail ? detail.handle : undefined} onClose={() => setDetail(null)}
        footer={
          detail ? (
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center gap-1 rounded-sm border border-danger/40 bg-danger-weak px-3 py-2 text-sm font-bold text-danger hover:bg-danger hover:text-white disabled:opacity-40" disabled={busy} onClick={() => setConfirmDel(detail)}>
                <Trash2 size={14} /> 삭제
              </button>
              <span className="flex-1" />
              <button type="button" className="rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={() => setDetail(null)}>닫기</button>
              <button type="button" className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy} onClick={saveEdit}>저장</button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-5 text-sm">
            <section className="space-y-3 rounded-sm bg-surface-2 p-3">
              <LabeledInput label="제목" value={edit.title} onChange={(v) => setEdit((s) => ({ ...s, title: v }))} />
              <LabeledInput label="slug(handle)" value={edit.handle} onChange={(v) => setEdit((s) => ({ ...s, handle: v }))} />
            </section>
            <section>
              <h4 className="mb-2 font-bold text-text">소속 상품 {detail.products?.length ?? 0}개</h4>
              <div className="space-y-1.5">
                {(detail.products ?? []).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="h-7 w-7 rounded-sm object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-sm bg-surface-2" />
                    )}
                    <span className="flex-1 text-text">{p.title}</span>
                    <button type="button" className="text-text-3 hover:text-danger disabled:opacity-40" disabled={busy} onClick={() => unlinkProduct(p.id)} aria-label="제외">
                      <X size={15} />
                    </button>
                  </div>
                ))}
                {(detail.products ?? []).length === 0 ? <p className="text-xs text-text-3">소속 상품이 없습니다.</p> : null}
              </div>
              <div className="mt-3 rounded-sm bg-surface-2 p-2.5">
                <div className="flex items-center gap-2">
                  <input className="h-9 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary" placeholder="상품명 검색 후 추가" value={pq} onChange={(e) => setPq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchProducts(); }} />
                  <button type="button" className="flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2" onClick={searchProducts}>
                    <Search size={14} /> 검색
                  </button>
                </div>
                {presults.length ? (
                  <div className="mt-2 space-y-1">
                    {presults.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 rounded-sm bg-surface px-2.5 py-1.5">
                        <span className="flex-1 text-text">{p.title}</span>
                        <button type="button" className="rounded-sm border border-border px-2 py-1 text-xs font-bold hover:bg-surface-2 disabled:opacity-40" disabled={busy} onClick={() => linkProduct(p.id)}>추가</button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmModal open={!!confirmDel} title="컬렉션을 삭제할까요?" message={confirmDel ? `'${confirmDel.title}' 컬렉션을 삭제합니다. 상품 소속은 해제됩니다.` : undefined} danger confirmText="삭제" meta={{ target: confirmDel?.title, reversible: false }} onConfirm={doDelete} onCancel={() => setConfirmDel(null)} />
    </div>
  );
}

/* ─────────────────────────── 상품 태그 ─────────────────────────── */

function TagsTab() {
  const toast = useToast();
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [confirmDel, setConfirmDel] = useState<ProductTag | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { product_tags } = await listTags({ limit: 200 });
      setTags(product_tags);
    } catch (e) {
      toast.show(`태그 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await createTag(value.trim());
      setValue("");
      await load();
      toast.show("태그를 추가했습니다.");
    } catch (e) {
      toast.show(`추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editVal.trim()) return;
    setBusy(true);
    try {
      await updateTag(id, editVal.trim());
      setEditId(null);
      await load();
      toast.show("태그를 수정했습니다.");
    } catch (e) {
      toast.show(`수정 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await deleteTag(confirmDel.id);
      setConfirmDel(null);
      await load();
      toast.show("태그를 삭제했습니다.");
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded bg-surface p-3 shadow-xs">
        <input className="h-9 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary" placeholder="새 태그 입력 후 Enter" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void add(); }} />
        <button type="button" className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40" disabled={busy || !value.trim()} onClick={add}>
          <Plus size={15} /> 추가
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-text-3">불러오는 중…</div>
      ) : tags.length === 0 ? (
        <EmptyState title="태그가 없습니다" description="상품 분류·검색에 쓰일 태그를 추가해 주세요." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm shadow-xs">
              {editId === t.id ? (
                <>
                  <input className="h-7 w-28 rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary" value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void saveEdit(t.id); }} autoFocus />
                  <button type="button" className="text-xs font-bold text-primary disabled:opacity-40" disabled={busy} onClick={() => saveEdit(t.id)}>저장</button>
                  <button type="button" className="text-xs text-text-3" onClick={() => setEditId(null)}>취소</button>
                </>
              ) : (
                <>
                  <span className="text-text">{t.value}</span>
                  <span className="text-[11px] text-text-3">{(t.products ?? []).length}</span>
                  <button type="button" className="text-text-3 hover:text-primary" onClick={() => { setEditId(t.id); setEditVal(t.value); }} aria-label="수정">수정</button>
                  <button type="button" className="text-text-3 hover:text-danger" onClick={() => setConfirmDel(t)} aria-label="삭제"><X size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!confirmDel} title="태그를 삭제할까요?" message={confirmDel ? `'${confirmDel.value}' 태그를 삭제합니다.` : undefined} danger confirmText="삭제" meta={{ target: confirmDel?.value, reversible: false }} onConfirm={doDelete} onCancel={() => setConfirmDel(null)} />
    </div>
  );
}

/* ─────────────── 카테고리별 옵션 매핑 탭 ─────────────── */

function CategoryOptionMapTab() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [typeTree, setTypeTree] = useState<ProductTypeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [maps, setMaps] = useState<CategoryOptionMap[]>([]);
  const [busy, setBusy] = useState(false);

  // 추가 폼 상태
  const [addOptId, setAddOptId] = useState<string>("");
  const [addOrder, setAddOrder] = useState<string>("0");

  // 전체 카테고리 평면 목록 + 분류 체계(옵션 템플릿 포함) 로드
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flatRes, typesRes] = await Promise.all([
        listCategoriesFlat(),
        getProductTypes(),
      ]);
      setCategories(flatRes.product_categories);
      setTypeTree(typesRes.product_types);
    } catch (e) {
      toast.show(`데이터 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // 카테고리 선택 시 매핑 목록 조회
  async function onSelectCategory(catId: string) {
    setSelectedCat(catId);
    setMaps([]);
    if (!catId) return;
    try {
      const { category_option_maps } = await listCategoryOptionMaps(catId);
      setMaps(category_option_maps);
    } catch (e) {
      toast.show(`매핑 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  async function reloadMaps(catId: string) {
    const { category_option_maps } = await listCategoryOptionMaps(catId);
    setMaps(category_option_maps);
  }

  async function addMap() {
    if (!selectedCat || !addOptId) {
      toast.show("카테고리와 옵션템플릿을 선택하세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      await createCategoryOptionMap({
        category_id: selectedCat,
        option_tmpl_id: addOptId,
        sort_order: Number(addOrder) || 0,
      });
      toast.show("옵션템플릿을 매핑했습니다.");
      setAddOptId("");
      setAddOrder("0");
      await reloadMaps(selectedCat);
    } catch (e) {
      toast.show(`매핑 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function removeMap(mapId: string) {
    setBusy(true);
    try {
      await deleteCategoryOptionMap(mapId);
      toast.show("매핑을 삭제했습니다.");
      if (selectedCat) await reloadMaps(selectedCat);
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }

  // 옵션템플릿 평면 목록 추출 (분야 → 분류 → 옵션)
  const allOptions: { id: string; label: string }[] = [];
  for (const field of typeTree) {
    for (const cat of field.children ?? []) {
      for (const opt of cat.options) {
        // option 은 id 가 없음(route GET 이 반환), product-types API에서 id 없이 반환
        // → 여기서는 option_tmpl_id 를 직접 알 수 없으므로 GET /catalog-types 로 받은 데이터 사용
        // (OptionTemplate 타입에 id 추가 필요, 여기서는 option_title/option_values 로 표시만)
        // 실제 매핑 추가 시 option_tmpl_id 는 사용자가 직접 입력하거나,
        // catalog-types API 를 통해 얻어야 함 → 이 컴포넌트에서는 텍스트 input 으로 입력 받음
        void opt;
      }
    }
  }

  const selectedCatName = categories.find((c) => c.id === selectedCat)?.name ?? "";

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-3">
        진열 카테고리별로 기본 제공할 상품 옵션 템플릿(사이즈·색상 등)을 매핑합니다.
        상품 등록 화면에서 이 카테고리를 선택하면 매핑된 옵션이 자동으로 제안됩니다.
      </p>

      {/* 카테고리 선택 */}
      <div className="rounded bg-surface p-4 shadow-xs space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-2">카테고리 선택</span>
          <select
            className="h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
            value={selectedCat}
            onChange={(e) => onSelectCategory(e.target.value)}
            disabled={loading}
          >
            <option value="">카테고리를 선택하세요</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.handle ? `(/${c.handle})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 매핑 목록 + 추가 */}
      {selectedCat ? (
        <div className="rounded bg-surface p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-text text-sm">
            '{selectedCatName}' 매핑된 옵션템플릿 {maps.length}개
          </h3>

          {maps.length === 0 ? (
            <p className="text-xs text-text-3">매핑된 옵션템플릿이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {maps.map((m) => (
                <div key={m.map_id} className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-2">
                  <div className="flex-1 min-w-0">
                    {m.option ? (
                      <>
                        <span className="font-medium text-text text-sm">{m.option.option_title}</span>
                        <span className="ml-2 text-xs text-text-3">
                          {Array.isArray(m.option.option_values) ? m.option.option_values.join(", ") : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-text-3">옵션 ID: {m.option_tmpl_id}</span>
                    )}
                    <span className="ml-2 text-[11px] text-text-3">순서 {m.sort_order}</span>
                  </div>
                  <button
                    type="button"
                    className="text-text-3 hover:text-danger disabled:opacity-40"
                    disabled={busy}
                    onClick={() => removeMap(m.map_id)}
                    aria-label="매핑 삭제"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 옵션템플릿 추가 폼 */}
          <div className="rounded-sm bg-surface-2 p-2.5 space-y-2">
            <div className="text-xs font-bold text-text-2 mb-1">옵션템플릿 매핑 추가</div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                className="h-8 flex-1 min-w-40 rounded-sm border border-border bg-surface px-2.5 text-xs outline-none focus:border-primary"
                placeholder="옵션템플릿 ID (ptopt_xxx)"
                value={addOptId}
                onChange={(e) => setAddOptId(e.target.value)}
              />
              <input
                type="number"
                className="h-8 w-20 rounded-sm border border-border bg-surface px-2.5 text-xs outline-none focus:border-primary"
                placeholder="순서"
                value={addOrder}
                onChange={(e) => setAddOrder(e.target.value)}
              />
              <button
                type="button"
                className="flex items-center gap-1 rounded-sm border border-border bg-surface px-2 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-40"
                disabled={busy || !addOptId.trim()}
                onClick={addMap}
              >
                <Plus size={13} /> 매핑 추가
              </button>
            </div>
            <p className="text-[11px] text-text-3">
              옵션템플릿 ID는 '상품 분류 체계' 페이지에서 확인할 수 있습니다 (예: ptopt_xxxxxx).
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── 공통 ─────────────────────────── */

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-2">{label}</span>
      <input className="h-9 w-full rounded-sm border border-border bg-surface px-2.5 text-sm outline-none focus:border-primary" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

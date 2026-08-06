"use client";

/**
 * 상품 관리 — 디자인 프로토타입(admin-screen-ops.js) SC.products / productBody / DRAWERS.product / OPS.stopSale 1:1 이식.
 *  · .scr 래퍼 + screen.css 클래스명 verbatim 유지.
 *  · 데이터 = Medusa REST (products.ts 함수 그대로 사용, mock 금지).
 *  · 통화 = formatCurrency (KRW 단독, 통화 드롭다운 없음).
 *  · 상세 드로어: productBody — 기본정보(langField KR/EN/JP), 판매정보(fgrid2), 옵션(dashed), 이미지(84px placeholder).
 *  · 판매중지 → ConfirmModal (prototype OPS.stopSale 메타 그대로).
 *  · 재고 탭(inventory) — 기존 구현 완전 보존.
 *  · [d3] 상세 드로어 내 탭: 기본정보 / 옵션·변형 / 가격관리
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { VariantMatrixPanel } from "./VariantMatrixPanel";
import { PricePanel } from "./PricePanel";
import {
  SlidersHorizontal,
  Plus,
  Search,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import {
  TranslationFields,
  type TranslationFieldsHandle,
} from "@/components/ui/TranslationFields";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateVariantPrice,
  representativePrice,
  slugify,
  type ProductListItem,
  type ProductDetail,
  type ProductStatus,
} from "@/lib/api/products";
import { getProductTypes, type ProductTypeNode } from "@/lib/api/product-types";
import { listCategoriesFlat, type Category } from "@/lib/api/categories";
import { productsToCsv } from "@/lib/products/product-list-logic";
import {
  parseProductCsv,
  buildImportPlan,
  importTemplateCsv,
} from "@/lib/products/product-import-logic";
import {
  listInventoryItems,
  listReservations,
  listStockLocations,
  updateLocationLevel,
  createLocationLevel,
  type InventoryItem,
  type ReservationItem,
  type StockLocation,
} from "@/lib/api/inventory";

/* ============================================================
   상수 / 헬퍼
   ============================================================ */
const PAGE_SIZE = 20;
const INV_PAGE_SIZE = 20;

type ActiveTab = "products" | "inventory";
/**
 * 상품에서 번역 가능한 필드.
 * 백엔드 `translation_settings.product.fields` 와 이름이 같아야 저장된다
 * (setup-translation.ts 에서 title/subtitle/description/material 로 설정).
 * handle 은 URL 이라 언어별로 달라지면 안 되므로 제외한다.
 */
const PRODUCT_TR_FIELDS = [
  { name: "title", label: "상품명", placeholder: "예) 프리미엄 코튼 오버핏 티셔츠" },
  { name: "subtitle", label: "부제" },
  { name: "description", label: "상세 설명", multiline: true },
];
/** 상세 드로어 내부 탭 — [d3] 옵션·변형 / 가격관리 추가 */
type DetailTab = "basic" | "variants" | "price";

const PROD_STATUS_TABS: { label: string; value: string; cls?: string }[] = [
  { label: "전체" , value: "" },
  { label: "판매중",  value: "published" },
  { label: "숨김",    value: "draft" },
  { label: "검토중",  value: "proposed" },
  { label: "반려",    value: "rejected" },
];

const STATUS_BADGE: Record<ProductStatus, { label: string; cls: string }> = {
  published: { label: "판매중",  cls: "success" },
  draft:     { label: "숨김",    cls: "neutral" },
  proposed:  { label: "검토중",  cls: "info" },
  rejected:  { label: "반려",    cls: "danger" },
};

function statusBadge(status: ProductStatus) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span className={`badge ${s.cls}`}>
      <span className="bdot" />
      {s.label}
    </span>
  );
}

function priceText(p: ProductListItem): string {
  const rep = representativePrice(p.variants);
  return rep ? formatCurrency(rep.amount, rep.currency_code) : "—";
}

function inventoryCount(p: ProductListItem): number {
  // variants 에 inventory_quantity 가 있으면 합산, 없으면 0
  return (p.variants ?? []).reduce((s, v) => s + ((v as unknown as { inventory_quantity?: number }).inventory_quantity ?? 0), 0);
}

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch { return iso; }
}

type BasicDraft = { title: string; subtitle: string; description: string; handle: string };

/* ============================================================
   Page Component
   ============================================================ */
export default function ProductsPage() {
  const toast = useToast();

  /* ── 탭 ── */
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");

  /* ── 상품 탭 상태 ── */
  const [products, setProducts]         = useState<ProductListItem[]>([]);
  const [count, setCount]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [q, setQ]                       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories]     = useState<Category[]>([]);
  const [sort, setSort]                 = useState("-updated_at"); // 정렬(최근수정) 기본
  const [loading, setLoading]           = useState(true);

  /* ── 상세/편집 상태 ── */
  const [detail, setDetail]             = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmStop, setConfirmStop]   = useState<ProductDetail | null>(null);
  const [busy, setBusy]                 = useState(false);
  const [creating, setCreating]         = useState(false);
  const detailTrRef = useRef<TranslationFieldsHandle>(null);
  /** [d3] 상세 드로어 내부 탭 */
  const [detailTab, setDetailTab]       = useState<DetailTab>("basic");

  /* ── 편집 드래프트 ── */
  const [basic, setBasic]               = useState<BasicDraft>({ title: "", subtitle: "", description: "", handle: "" });
  const [priceDraft, setPriceDraft]     = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl]         = useState("");
  const [catalogTypes, setCatalogTypes] = useState<ProductTypeNode[]>([]);
  const [typeId, setTypeId]             = useState("");
  const [disclosure, setDisclosure]     = useState<Record<string, string>>({});

  /* ── 등록 폼 ── */
  const [form, setForm] = useState({
    title: "", amount: "", status: "draft" as ProductStatus, typeId: "",
  });

  /* ── 재고 탭 상태 ── */
  const [invItems, setInvItems]         = useState<InventoryItem[]>([]);
  const [invCount, setInvCount]         = useState(0);
  const [invPage, setInvPage]           = useState(1);
  const [invQ, setInvQ]                 = useState("");
  const [invLoading, setInvLoading]     = useState(false);
  const [invDetail, setInvDetail]       = useState<InventoryItem | null>(null);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [qtyDraft, setQtyDraft]         = useState<Record<string, string>>({});
  const [invBusy, setInvBusy]           = useState(false);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [resLoading, setResLoading]     = useState(false);
  const [resCount, setResCount]         = useState(0);

  /* ============================================================
     데이터 로드
     ============================================================ */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProducts({
        q: q || undefined,
        status: statusFilter || undefined,
        category_id: filterCategory || undefined,
        order: sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setProducts(res.products);
      setCount(res.count);
    } catch (e) {
      toast.show(`상품 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, filterCategory, page, toast, sort]);

  /* ── 정렬 토글/표시 ── */
  function toggleSort(field: string) {
    setPage(1);
    setSort((s) => (s === `-${field}` ? field : `-${field}`));
  }
  function sortCaret(field: string): string {
    return sort === field ? "▲" : sort === `-${field}` ? "▼" : "↕";
  }

  useEffect(() => { void load(); }, [load]);

  // 카테고리 필터용 목록(1회 로드)
  useEffect(() => {
    listCategoriesFlat()
      .then(({ product_categories }) => setCategories(product_categories))
      .catch(() => undefined);
  }, []);

  /* ── CSV 내보내기/가져오기 (t001 export · t004 import) ── */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  /** 파일 다운로드 공통 헬퍼 */
  const downloadCsv = useCallback((csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /** 현재 필터 기준 상품 목록 → CSV 내보내기 (productsToCsv, 코어 listProducts) */
  const exportProductsCsv = useCallback(async () => {
    try {
      const res = await listProducts({
        q: q || undefined,
        status: statusFilter || undefined,
        limit: 1000,
        offset: 0,
      });
      downloadCsv(productsToCsv(res.products), `products_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.show(`상품 ${res.products.length}건을 CSV로 내보냈습니다.`);
    } catch (e) {
      toast.show(`내보내기 실패: ${(e as Error).message}`, "danger");
    }
  }, [q, statusFilter, downloadCsv, toast]);

  /** import 템플릿 다운로드 (UT-002) */
  const downloadImportTemplate = useCallback(() => {
    downloadCsv(importTemplateCsv(), "products_import_template.csv");
  }, [downloadCsv]);

  /** CSV 파일 선택 → 파싱·검증·코어 createProduct 반복(부분 성공, UT-001) */
  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const text = await file.text();
        const plan = buildImportPlan(parseProductCsv(text));
        if (plan.total === 0) {
          toast.show("가져올 데이터 행이 없습니다(헤더만 존재).", "danger");
          return;
        }
        let created = 0;
        const failed: string[] = [];
        for (const row of plan.valid) {
          try {
            await createProduct(row);
            created += 1;
          } catch (e) {
            failed.push(`'${row.title}': ${(e as Error).message}`);
          }
        }
        // 부분 성공 리포트: 생성 N건 + 검증 스킵 M건 + 생성 실패 K건
        const parts = [`생성 ${created}건`];
        if (plan.skipped.length) parts.push(`검증 스킵 ${plan.skipped.length}건`);
        if (failed.length) parts.push(`생성 실패 ${failed.length}건`);
        toast.show(
          `상품 가져오기 완료 — ${parts.join(" · ")}`,
          failed.length || plan.skipped.length ? "info" : "success"
        );
        await load();
      } catch (e) {
        toast.show(`가져오기 실패: ${(e as Error).message}`, "danger");
      } finally {
        setImporting(false);
      }
    },
    [load, toast]
  );

  const loadInv = useCallback(async () => {
    setInvLoading(true);
    try {
      const res = await listInventoryItems({ q: invQ || undefined, limit: INV_PAGE_SIZE, offset: (invPage - 1) * INV_PAGE_SIZE });
      setInvItems(res.inventory_items);
      setInvCount(res.count);
    } catch (e) {
      toast.show(`재고 조회 실패: ${(e as Error).message}`, "danger");
    } finally { setInvLoading(false); }
  }, [invQ, invPage, toast]);

  const loadReservations = useCallback(async () => {
    setResLoading(true);
    try {
      const res = await listReservations({ limit: 50 });
      setReservations(res.reservations);
      setResCount(res.count);
    } catch (e) {
      toast.show(`예약 조회 실패: ${(e as Error).message}`, "danger");
    } finally { setResLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (activeTab !== "inventory") return;
    void loadInv();
    void loadReservations();
    listStockLocations()
      .then(({ stock_locations }) => setStockLocations(stock_locations))
      .catch(() => setStockLocations([]));
  }, [activeTab, loadInv, loadReservations]);

  useEffect(() => {
    getProductTypes()
      .then(({ product_types }) => {
        const flat: ProductTypeNode[] = [];
        for (const field of product_types)
          for (const c of field.children ?? [])
            flat.push({ ...c, name: `${field.name} › ${c.name}` });
        setCatalogTypes(flat);
      })
      .catch(() => setCatalogTypes([]));
  }, []);

  const selectedType = catalogTypes.find((t) => t.id === typeId) ?? null;

  /* ============================================================
     편집 헬퍼
     ============================================================ */
  function syncEditState(p: ProductDetail) {
    setBasic({ title: p.title ?? "", subtitle: p.subtitle ?? "", description: p.description ?? "", handle: p.handle ?? "" });
    const pd: Record<string, string> = {};
    for (const v of p.variants ?? []) {
      const rep = representativePrice([v]);
      pd[v.id] = rep ? String(rep.amount) : "";
    }
    setPriceDraft(pd);
    setImageUrl("");
    const md = (p.metadata ?? {}) as { catalog_type_id?: string; disclosure?: Record<string, string> };
    setTypeId(md.catalog_type_id ?? "");
    setDisclosure(md.disclosure ?? {});

  }

  async function openDetail(p: ProductListItem) {
    setDetail(null);
    setDetailLoading(true);
    setDetailTab("basic"); // [d3] 드로어 열릴 때 기본정보 탭으로 초기화
    try {
      const { product } = await getProduct(p.id);
      setDetail(product);
      syncEditState(product);
    } catch (e) {
      toast.show(`상품 상세 조회 실패: ${(e as Error).message}`, "danger");
    } finally { setDetailLoading(false); }
  }

  async function reloadDetail(id: string) {
    const { product } = await getProduct(id);
    setDetail(product);
    syncEditState(product);
    await load();
  }

  async function saveBasic() {
    if (!detail) return;
    if (!basic.title.trim() || !basic.handle.trim()) {
      toast.show("상품명과 상품코드(handle)는 필수입니다.", "danger");
      return;
    }
    setBusy(true);
    try {
      await updateProduct(detail.id, {
        title: basic.title.trim(),
        subtitle: basic.subtitle.trim() || null,
        description: basic.description.trim() || null,
        handle: basic.handle.trim(),
      });
      // 번역은 원본과 별도 테이블이라 따로 저장한다.
      // 번역만 실패해도 기본 정보 저장은 이미 끝났으므로, 실패를 구분해서 알린다.
      let trFailed: string | null = null;
      try {
        await detailTrRef.current?.save();
      } catch (e) {
        trFailed = (e as Error).message;
      }
      await reloadDetail(detail.id);
      await detailTrRef.current?.reload();
      toast.show(
        trFailed
          ? `기본 정보는 저장했지만 번역 저장에 실패했습니다: ${trFailed}`
          : "기본 정보를 저장했습니다.",
        trFailed ? "danger" : undefined
      );
    } catch (e) {
      toast.show(`저장 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  async function saveClassification() {
    if (!detail) return;
    setBusy(true);
    try {
      await updateProduct(detail.id, { metadata: { ...(detail.metadata ?? {}), catalog_type_id: typeId || null, disclosure } });
      await reloadDetail(detail.id);
      toast.show("상품 분류·고시 정보를 저장했습니다.");
    } catch (e) {
      toast.show(`분류 저장 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  function missingDisclosure(): string[] {
    if (!selectedType) return [];
    return (selectedType.disclosure_fields ?? [])
      .filter((f) => f.required && !(disclosure[f.field_key] ?? "").trim())
      .map((f) => f.label);
  }

  async function savePrice(variantId: string) {
    if (!detail) return;
    const rep = representativePrice((detail.variants ?? []).filter((v) => v.id === variantId));
    const currency = rep?.currency_code ?? "krw";
    const amount = Number(priceDraft[variantId]);
    if (!Number.isFinite(amount) || amount < 0) { toast.show("가격을 확인하세요.", "danger"); return; }
    setBusy(true);
    try {
      await updateVariantPrice(detail.id, variantId, [{ amount, currency_code: currency }]);
      await reloadDetail(detail.id);
      toast.show(`변형 가격을 ${formatCurrency(amount, currency)}(으)로 저장했습니다.`);
    } catch (e) {
      toast.show(`가격 저장 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  async function addImage() {
    if (!detail || !imageUrl.trim()) return;
    setBusy(true);
    try {
      const urls = [...(detail.images ?? []).map((i) => ({ url: i.url })), { url: imageUrl.trim() }];
      await updateProduct(detail.id, { images: urls });
      setImageUrl("");
      await reloadDetail(detail.id);
      toast.show("이미지를 추가했습니다.");
    } catch (e) {
      toast.show(`이미지 추가 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  async function removeImage(url: string) {
    if (!detail) return;
    setBusy(true);
    try {
      const urls = (detail.images ?? []).filter((i) => i.url !== url).map((i) => ({ url: i.url }));
      await updateProduct(detail.id, { images: urls });
      await reloadDetail(detail.id);
      toast.show("이미지를 삭제했습니다.");
    } catch (e) {
      toast.show(`이미지 삭제 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  async function toggleSale(p: ProductDetail) {
    const next: ProductStatus = p.status === "published" ? "draft" : "published";
    if (next === "published") {
      const missing = missingDisclosure();
      if (missing.length) {
        setConfirmStop(null);
        toast.show(`게시 불가 — 고시 필수항목 누락: ${missing.join(", ")}`, "danger");
        return;
      }
    }
    setConfirmStop(null);
    setBusy(true);
    try {
      await updateProduct(p.id, { status: next });
      await reloadDetail(p.id);
      toast.show(next === "draft" ? "판매를 중지했습니다(노출 중단)." : "판매를 재개했습니다.");
    } catch (e) {
      toast.show(`상태 변경 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  async function submitCreate() {
    const amount = Number(form.amount);
    if (!form.title.trim()) { toast.show("상품명을 입력하세요.", "danger"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.show("판매가를 확인하세요.", "danger"); return; }
    setBusy(true);
    try {
      const { product } = await createProduct({ title: form.title.trim(), status: form.status, amount, currency_code: "krw" });
      if (form.typeId) await updateProduct(product.id, { metadata: { catalog_type_id: form.typeId, disclosure: {} } });
      toast.show(`'${product.title}' 상품을 등록했습니다.`);
      setCreating(false);
      setForm({ title: "", amount: "", status: "draft", typeId: "" });
      await load();
      void openDetail(product);
    } catch (e) {
      toast.show(`상품 등록 실패: ${(e as Error).message}`, "danger");
    } finally { setBusy(false); }
  }

  /* ── 재고 상세 드로어 ── */
  function openInvDetail(item: InventoryItem) {
    setInvDetail(item);
    const draft: Record<string, string> = {};
    for (const lv of item.location_levels) draft[lv.location_id] = String(lv.stocked_quantity);
    setQtyDraft(draft);
  }

  async function saveLocationQty(locationId: string) {
    if (!invDetail) return;
    const qty = Number(qtyDraft[locationId]);
    if (!Number.isFinite(qty) || qty < 0) { toast.show("수량은 0 이상의 숫자여야 합니다.", "danger"); return; }
    setInvBusy(true);
    try {
      const existing = invDetail.location_levels.find((lv) => lv.location_id === locationId);
      if (existing) { await updateLocationLevel(invDetail.id, locationId, qty); }
      else { await createLocationLevel(invDetail.id, locationId, qty); }
      const refreshed = await listInventoryItems({ limit: INV_PAGE_SIZE, offset: (invPage - 1) * INV_PAGE_SIZE, q: invQ || undefined });
      setInvItems(refreshed.inventory_items);
      setInvCount(refreshed.count);
      const updated = refreshed.inventory_items.find((i) => i.id === invDetail.id);
      if (updated) openInvDetail(updated);
      toast.show("재고 수량을 저장했습니다.");
    } catch (e) {
      toast.show(`재고 저장 실패: ${(e as Error).message}`, "danger");
    } finally { setInvBusy(false); }
  }

  /* ============================================================
     페이지네이션 계산
     ============================================================ */
  const totalPages  = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const invTotalPages = Math.max(1, Math.ceil(invCount / INV_PAGE_SIZE));

  /* ============================================================
     인라인 편집 핸들러 (테이블 셀 클릭 → 상세 드로어로 대체)
     ============================================================ */
  // 테이블 행 클릭 = openDetail (prototype data-drawer="product")

  /* ============================================================
     JSX
     ============================================================ */
  return (
    <div className="scr">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>상품 관리</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}개
            {activeTab === "inventory" ? ` · 재고 아이템 ${invCount.toLocaleString("ko-KR")}개` : ""}
          </div>
        </div>
        <div className="ph-actions">
          {activeTab === "products" && (
            <>
              {/* 숨김 파일 input — CSV 가져오기 (t004) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f);
                  e.target.value = ""; // 같은 파일 재선택 허용
                }}
              />
              <button
                className="btn"
                type="button"
                onClick={downloadImportTemplate}
                title="가져오기 템플릿(CSV) 다운로드"
              >
                <SlidersHorizontal size={16} /> 템플릿
              </button>
              <button
                className="btn"
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} /> {importing ? "가져오는 중…" : "가져오기"}
              </button>
              <button className="btn" type="button" onClick={() => void exportProductsCsv()}>
                <Upload size={16} style={{ transform: "rotate(180deg)" }} /> 내보내기
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => setCreating(true)}
              >
                <Plus size={16} /> 상품 등록
              </button>
            </>
          )}
        </div>
      </div>

      {/* ② 탭 전환 (상품 / 재고) */}
      <div className="segtabs" style={{ marginBottom: 16 }}>
        {([["products", "상품"], ["inventory", "재고"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={`segtab${activeTab === tab ? " active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ 상품 탭 ══════════════════════════ */}
      {activeTab === "products" && (
        <>
          {/* ③ 필터바 */}
          <div className="filterbar">
            <div className="search-input">
              <Search size={15} />
              <input
                type="text"
                placeholder="상품명 · 상품코드 검색"
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
              />
            </div>
            <select
              className="select"
              value={filterCategory}
              onChange={(e) => { setPage(1); setFilterCategory(e.target.value); }}
              style={{ appearance: "none" }}
              aria-label="카테고리 필터"
            >
              <option value="">카테고리: 전체</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              className="select"
              type="button"
              onClick={() => {
                // 순환 필터: 전체 → published → draft → proposed → rejected → 전체
                const order = ["", "published", "draft", "proposed", "rejected"];
                const next = order[(order.indexOf(statusFilter) + 1) % order.length];
                setPage(1);
                setStatusFilter(next);
              }}
            >
              <span className="sl-k">판매상태</span>{" "}
              {statusFilter ? (STATUS_BADGE[statusFilter as ProductStatus]?.label ?? "전체") : "전체"}{" "}
              <ChevronDown size={15} />
            </button>
            {/* 동작하지 않던 필터(2026-08-03) — 눌러도 반응이 없어 고장으로 오해되므로 비활성 + 사유를 표시한다. */}
          <button className="select" type="button"
            disabled
            title="재고 상태 필터는 준비 중입니다. 재고 탭에서 확인하세요."
          >
              <span className="sl-k">재고</span> 전체 <ChevronDown size={15} />
            </button>
            <span className="spacer" />
            <button
              className="btn ghost"
              type="button"
              onClick={() => { setQ(""); setStatusFilter(""); setPage(1); }}
            >
              초기화
            </button>
            <button className="btn primary" type="button" onClick={() => { setPage(1); void load(); }}>
              조회
            </button>
          </div>

          {/* ④ 카드 + 세그탭(판매상태) + 테이블 */}
          <div className="card" data-kind="products">
            {/* 세그탭 — 판매상태 필터 */}
            <div className="segtabs">
              {PROD_STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`segtab${statusFilter === t.value ? " active" : ""}`}
                  onClick={() => { setPage(1); setStatusFilter(t.value); }}
                >
                  {t.label}
                  {t.value === "" && (
                    <span className="cnt">{count.toLocaleString("ko-KR")}</span>
                  )}
                </button>
              ))}
            </div>

            {/* 테이블 */}
            <div className="table-wrap">
              {loading ? (
                <div className="empty"><p>불러오는 중…</p></div>
              ) : products.length === 0 ? (
                <div className="empty">
                  <h4>상품이 없습니다</h4>
                  <p>조건에 맞는 상품이 없습니다.</p>
                </div>
              ) : (
                <table className="dt">
                  <thead>
                    <tr>
                      <th className="col-check"><span className="ck" /></th>
                      <th>상품</th>
                      <th>카테고리</th>
                      <th className="num">판매가</th>
                      <th className="num">재고</th>
                      <th>판매상태</th>
                      <th className="sortable" style={{ cursor: "pointer" }} onClick={() => toggleSort("updated_at")}>최근 수정 <span className="sortcaret">{sortCaret("updated_at")}</span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const inv = inventoryCount(p);
                      const invStyle: React.CSSProperties =
                        inv === 0
                          ? { color: "var(--danger)", fontWeight: 700 }
                          : inv < 25
                          ? { color: "var(--warning)", fontWeight: 700 }
                          : {};
                      return (
                        <tr
                          key={p.id}
                          onClick={() => openDetail(p)}
                        >
                          <td className="col-check" onClick={(e) => e.stopPropagation()}>
                            <span className="ck" />
                          </td>
                          <td>
                            <div className="prod-cell">
                              {p.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.thumbnail} alt="" className="thumb" />
                              ) : (
                                <span className="thumb" />
                              )}
                              <span className="pc-t">
                                <b>{p.title}</b>
                                <span>{p.handle}</span>
                              </span>
                            </div>
                          </td>
                          <td className="muted">
                            {(p.categories ?? []).map((c) => c.name).join(", ") || "—"}
                          </td>
                          <td className="num">
                            <span className="inline-edit" data-prefix="₩">
                              <span className="ie-val">{priceText(p)}</span>
                              <span className="ie-pen"><Edit size={13} /></span>
                            </span>
                          </td>
                          <td className="num">
                            <span className="inline-edit">
                              <span className="ie-val" style={invStyle}>{inv.toLocaleString("ko-KR")}</span>
                              <span className="ie-pen"><Edit size={13} /></span>
                            </span>
                          </td>
                          <td>{statusBadge(p.status)}</td>
                          <td className="muted">{formatKst(p.updated_at)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <span className="kebab"><MoreHorizontal size={18} /></span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 페이지네이션 */}
            <div className="tablefoot">
              <span className="tf-info">
                {((page - 1) * PAGE_SIZE + 1)}–{Math.min(page * PAGE_SIZE, count)} / {count.toLocaleString("ko-KR")}개
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
        </>
      )}

      {/* ══════════════════════════ 재고 탭 ══════════════════════════ */}
      {activeTab === "inventory" && (
        <>
          <div className="filterbar">
            <div className="search-input">
              <Search size={15} />
              <input
                type="text"
                placeholder="SKU 또는 제품명 검색"
                value={invQ}
                onChange={(e) => { setInvPage(1); setInvQ(e.target.value); }}
              />
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              {invLoading ? (
                <div className="empty"><p>불러오는 중…</p></div>
              ) : invItems.length === 0 ? (
                <div className="empty">
                  <h4>재고 아이템이 없습니다</h4>
                  <p>Medusa 상품 변형에 연결된 재고 아이템이 표시됩니다.</p>
                </div>
              ) : (
                <table className="dt">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>제품명</th>
                      <th className="num">보유 수량</th>
                      <th className="num">예약 수량</th>
                      <th className="num">가용 수량</th>
                      <th className="num">위치 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invItems.map((item) => {
                      const avail = item.stocked_quantity - item.reserved_quantity;
                      return (
                        <tr key={item.id} onClick={() => openInvDetail(item)}>
                          <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{item.sku ?? "—"}</span></td>
                          <td>{item.title ?? "—"}</td>
                          <td className="num strong">{item.stocked_quantity.toLocaleString("ko-KR")}</td>
                          <td className="num" style={{ color: "var(--warning)" }}>{item.reserved_quantity.toLocaleString("ko-KR")}</td>
                          <td className="num strong" style={{ color: avail <= 0 ? "var(--danger)" : "var(--success)" }}>{avail.toLocaleString("ko-KR")}</td>
                          <td className="num muted">{item.location_levels.length}곳</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {invTotalPages > 1 && (
              <div className="tablefoot">
                <span className="tf-info">{invCount.toLocaleString("ko-KR")}개 중 {invPage}/{invTotalPages} 페이지</span>
                <span className="spacer" />
                <div className="pager">
                  <button className={`pg${invPage <= 1 ? " dis" : ""}`} type="button" onClick={() => setInvPage((p) => Math.max(1, p - 1))}><ChevronLeft size={15} /></button>
                  <button className={`pg${invPage >= invTotalPages ? " dis" : ""}`} type="button" onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}><ChevronRight size={15} /></button>
                </div>
              </div>
            )}
          </div>

          {/* 예약 현황 */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              예약 현황{" "}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)" }}>
                — 주문 확정 전 선점된 재고 (총 {resCount.toLocaleString("ko-KR")}건)
              </span>
            </h3>
            <div className="card">
              <div className="table-wrap">
                {resLoading ? (
                  <div className="empty"><p>불러오는 중…</p></div>
                ) : reservations.length === 0 ? (
                  <div className="empty"><h4>예약 아이템이 없습니다</h4></div>
                ) : (
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>제품명</th>
                        <th>위치</th>
                        <th className="num">예약 수량</th>
                        <th>생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((r) => {
                        const loc = stockLocations.find((s) => s.id === r.location_id);
                        return (
                          <tr key={r.id}>
                            <td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.inventory_item?.sku ?? "—"}</span></td>
                            <td>{r.inventory_item?.title ?? "—"}</td>
                            <td className="muted">{loc ? loc.name : r.location_id}</td>
                            <td className="num strong" style={{ color: "var(--warning)" }}>{r.quantity.toLocaleString("ko-KR")}</td>
                            <td className="muted">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════
          상품 상세 드로어 (DRAWERS.product)
          productBody 1:1 이식: dsec / dsec-t / langField / fgrid2 / 옵션(dashed) / 이미지(84px)
         ══════════════════════════ */}
      <DetailDrawer
        open={!!detail || detailLoading}
        wide
        title={detail ? detail.title : "상품 상세"}
        sub={detail
          ? `${detail.handle}${detail.categories?.length ? " · " + detail.categories.map((c) => c.name).join(", ") : ""}`
          : undefined}
        status={detail ? statusBadge(detail.status) : undefined}
        onClose={() => { setDetail(null); setDetailLoading(false); }}
        footer={
          detail ? (
            <div className="detail-f" style={{ display: "flex", width: "100%", gap: 8, alignItems: "center" }}>
              <div className="danger-zone">
                <button
                  type="button"
                  className="btn danger"
                  disabled={busy}
                  onClick={() => setConfirmStop(detail)}
                >
                  {detail.status === "published" ? "판매 중지" : "판매 재개"}
                </button>
              </div>
              <span className="spacer" />
              <button type="button" className="btn" onClick={() => setDetail(null)}>닫기</button>
              {/* [d3] 기본정보 탭에서만 "변경사항 저장" 표시 (옵션/가격 탭은 각 패널 내 저장 버튼 사용) */}
              {detailTab === "basic" && (
                <button type="button" className="btn primary" disabled={busy} onClick={saveBasic}>
                  변경사항 저장
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {detailLoading && !detail ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
        ) : detail ? (
          /* productBody 마크업 — [d3] 상세 드로어 내 탭 */
          <div>
            {/* ── [d3] 내부 탭: 기본정보 / 옵션·변형 / 가격관리 ── */}
            <div className="segtabs" style={{ marginBottom: 20 }}>
              {(
                [
                  ["basic", "기본 정보"],
                  ["variants", "옵션·변형 매트릭스"],
                  ["price", "가격 관리"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  className={`segtab${detailTab === tab ? " active" : ""}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── 탭: 기본 정보 ── */}
            {detailTab === "basic" && (
              <>
            {/* ── 기본 정보 ── */}
            <div className="dsec">
              <div className="dsec-t">기본 정보</div>
              {/* 언어별 입력 — 예전엔 KR/EN/JP 탭이 화면에만 있고 동작하지 않았다.
                  지금은 스토어 지원 언어에서 탭을 만들고, 기본 언어 외에는
                  번역 테이블에 저장한다(2026-08-05). */}
              <TranslationFields
                ref={detailTrRef}
                reference="product"
                referenceId={detail.id}
                fields={PRODUCT_TR_FIELDS}
                baseValues={basic}
                onBaseChange={(name, value) =>
                  setBasic((b) => ({ ...b, [name]: value }))
                }
              />
              {/* 카테고리 */}
              <div className="frow">
                <span className="field-l">카테고리 <span className="req">*</span></span>
                <div className="fgrid2">
                  <select className="inp select-like" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                    <option value="">미지정</option>
                    {catalogTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* 상품코드 — URL 에 쓰이므로 언어별로 달라지면 안 된다(번역 대상 아님) */}
              <div className="frow">
                <span className="field-l">상품코드</span>
                <input
                  className="inp"
                  value={basic.handle}
                  onChange={(e) => setBasic((b) => ({ ...b, handle: e.target.value }))}
                />
              </div>
            </div>

            {/* ── 판매 정보 ── */}
            <div className="dsec">
              <div className="dsec-t">판매 정보</div>
              {(detail.variants ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>등록된 변형이 없습니다.</p>
              ) : (
                (detail.variants ?? []).map((v) => {
                  const rep = representativePrice([v]);
                  return (
                    <div className="frow" key={v.id}>
                      <div className="fgrid2">
                        <div>
                          <span className="field-l">판매가 <span className="req">*</span></span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              className="inp"
                              type="number"
                              style={{ textAlign: "right" }}
                              value={priceDraft[v.id] ?? (rep ? String(rep.amount) : "")}
                              onChange={(e) => setPriceDraft((d) => ({ ...d, [v.id]: e.target.value }))}
                              placeholder="₩ 0"
                            />
                            <button type="button" className="btn sm" disabled={busy} onClick={() => savePrice(v.id)}>저장</button>
                          </div>
                        </div>
                        <div>
                          <span className="field-l">변형 / SKU</span>
                          <input className="inp" value={`${v.title ?? "기본"} / ${v.sku ?? "—"}`} disabled />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* 판매 상태 탭 */}
              <div className="frow">
                <span className="field-l">판매 상태</span>
                <div className="lang-tabs">
                  {([["published", "판매중"], ["draft", "판매중지"], ["proposed", "숨김"]] as const).map(([val, label]) => (
                    <span
                      key={val}
                      className={`lang-tab${detail.status === val ? " active" : ""}`}
                      style={{ cursor: "default" }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 상품 분류 · 고시 ── */}
            {selectedType && (
              <div className="dsec">
                <div className="dsec-t">상품정보제공고시</div>
                <div className="frow">
                  {(selectedType.disclosure_fields ?? []).map((f) => (
                    <div key={f.field_key} style={{ marginBottom: 10 }}>
                      <span className="field-l">
                        {f.label}{f.required ? <span className="req"> *</span> : null}
                      </span>
                      <input
                        className="inp"
                        value={disclosure[f.field_key] ?? ""}
                        onChange={(e) => setDisclosure((d) => ({ ...d, [f.field_key]: e.target.value }))}
                        placeholder={f.required ? "필수" : "선택"}
                      />
                    </div>
                  ))}
                  <button type="button" className="btn sm" disabled={busy} onClick={saveClassification}>
                    분류·고시 저장
                  </button>
                </div>
              </div>
            )}

            {/* ── 이미지 ── */}
            <div className="dsec">
              <div className="dsec-t">이미지</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* 대표 이미지 (upload placeholder or actual) */}
                {detail.images && detail.images.length > 0 ? (
                  detail.images.map((img) => (
                    <div key={img.id} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        style={{ width: 84, height: 84, borderRadius: 10, border: "1px solid var(--border)", objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeImage(img.url)}
                        style={{
                          position: "absolute", top: -6, right: -6,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  /* prototype 84px placeholder */
                  <div style={{
                    width: 84, height: 84, borderRadius: 10,
                    border: "1px solid var(--border)", background: "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-3)", fontSize: 12, flexDirection: "column", gap: 4,
                  }}>
                    <Upload size={18} />대표
                  </div>
                )}
                {/* 추가 placeholder */}
                <div style={{
                  width: 84, height: 84, borderRadius: 10,
                  border: "1px dashed var(--border)", background: "var(--surface)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)",
                }}>
                  <Plus size={18} />
                </div>
              </div>
              {/* URL 추가 입력 */}
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <input
                  type="url"
                  className="inp"
                  placeholder="이미지 URL 입력(https://…)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <button type="button" className="btn sm" disabled={busy || !imageUrl.trim()} onClick={addImage}>
                  추가
                </button>
              </div>
            </div>
              </>
            )}

            {/* ── 탭: 옵션·변형 매트릭스 [d3] ── */}
            {detailTab === "variants" && (
              <VariantMatrixPanel
                product={detail}
                onRefresh={async () => { await reloadDetail(detail.id); }}
              />
            )}

            {/* ── 탭: 가격 관리 [d3 t007] ── */}
            {detailTab === "price" && (
              <PricePanel
                product={detail}
                onRefresh={async () => { await reloadDetail(detail.id); }}
              />
            )}
          </div>
        ) : null}
      </DetailDrawer>

      {/* ══════════════════════════
          상품 등록 드로어 (DRAWERS._newProduct)
         ══════════════════════════ */}
      <DetailDrawer
        open={creating}
        title="상품 등록"
        sub="새 상품을 등록합니다"
        onClose={() => setCreating(false)}
        footer={
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn" onClick={() => setCreating(false)}>취소</button>
            <button type="button" className="btn" disabled={busy}
              onClick={() => toast.show("임시 저장했습니다.", "info")}>
              임시 저장
            </button>
            <button type="button" className="btn primary" disabled={busy} onClick={submitCreate}>
              상품 등록
            </button>
          </div>
        }
      >
        {/* productBody(null, true) — isNew=true */}
        <div>
          <div className="notice" style={{ marginBottom: 16 }}>
            템플릿형 등록 폼 — 어느 업종의 상품이든 동일한 공통 필드(기본정보·옵션·이미지·다국어)로 입력합니다.
          </div>

          <div className="dsec">
            <div className="dsec-t">기본 정보</div>
            {/* 신규 등록에는 언어 탭을 두지 않는다 — 저장 전에는 번역을 붙일 대상(id)이 없다.
                저장 후 상세에서 언어 탭이 나타난다(2026-08-05). */}
            <div className="frow">
              <span className="field-l">상품명 <span className="req">*</span></span>
              <input
                className="inp"
                value={form.title}
                placeholder="예) 프리미엄 코튼 오버핏 티셔츠"
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <p className="hint" style={{ marginTop: 4 }}>
                영어 등 다국어 이름은 저장한 뒤 상세 화면에서 입력합니다.
              </p>
            </div>
            {/* 카테고리 */}
            <div className="frow">
              <span className="field-l">카테고리 <span className="req">*</span></span>
              <div className="fgrid2">
                <select className="inp select-like" value={form.typeId} onChange={(e) => setForm((f) => ({ ...f, typeId: e.target.value }))}>
                  <option value="">대분류 선택</option>
                  {catalogTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button className="inp select-like" type="button" disabled>중분류 <ChevronDown size={15} /></button>
              </div>
            </div>
            {/* 상품코드 */}
            <div className="frow">
              <span className="field-l">상품코드</span>
              <input className="inp" value={form.title ? slugify(form.title) : ""} disabled placeholder="자동 생성" />
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-t">판매 정보</div>
            <div className="frow">
              <div className="fgrid2">
                <div>
                  <span className="field-l">판매가 <span className="req">*</span></span>
                  <input
                    className="inp"
                    type="number"
                    style={{ textAlign: "right" }}
                    value={form.amount}
                    placeholder="₩ 0"
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <span className="field-l">재고 수량</span>
                  <input className="inp" type="number" defaultValue={0} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="frow">
              <span className="field-l">판매 상태</span>
              <div className="lang-tabs">
                {([["published", "판매중"], ["draft", "판매중지"], ["proposed", "숨김"]] as const).map(([val, label]) => (
                  <span
                    key={val}
                    className={`lang-tab${form.status === val ? " active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, status: val }))}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-t">옵션</div>
            <div className="frow" style={{ padding: "14px", border: "1px dashed var(--border)", borderRadius: 8, color: "var(--text-3)", fontSize: 13, textAlign: "center" }}>
              ＋ 색상 / 사이즈 등 옵션 조합 · 재고 매트릭스
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-t">이미지</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 84, height: 84, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12, flexDirection: "column", gap: 4 }}>
                <Upload size={18} />대표
              </div>
              <div style={{ width: 84, height: 84, borderRadius: 10, border: "1px dashed var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
                <Plus size={18} />
              </div>
              <div style={{ width: 84, height: 84, borderRadius: 10, border: "1px dashed var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
                <Plus size={18} />
              </div>
            </div>
          </div>
        </div>
      </DetailDrawer>

      {/* ══════════════════════════
          판매 중지 Confirm (OPS.stopSale)
         ══════════════════════════ */}
      <ConfirmModal
        open={!!confirmStop}
        danger={confirmStop?.status === "published"}
        title={confirmStop?.status === "published" ? "판매를 중지하시겠습니까?" : "판매를 재개하시겠습니까?"}
        message={confirmStop?.status === "published"
          ? "쇼핑몰에서 상품 노출이 즉시 중단됩니다."
          : "상품을 다시 판매중으로 전환합니다."}
        confirmText={confirmStop?.status === "published" ? "판매 중지" : "판매 재개"}
        meta={confirmStop ? {
          target: confirmStop.title,
          effect: confirmStop.status === "published" ? "노출 중단 (재고·주문 유지)" : "노출 시작",
          reversible: true,
        } : undefined}
        onConfirm={() => confirmStop && toggleSale(confirmStop)}
        onCancel={() => setConfirmStop(null)}
      />

      {/* ══════════════════════════
          재고 상세 드로어 — 위치별 수량 조정
         ══════════════════════════ */}
      <DetailDrawer
        open={!!invDetail}
        wide
        title={invDetail ? `재고 상세: ${invDetail.title ?? invDetail.sku ?? "—"}` : "재고 상세"}
        sub={invDetail ? `SKU: ${invDetail.sku ?? "—"}` : undefined}
        onClose={() => setInvDetail(null)}
        footer={
          invDetail ? (
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <button type="button" className="btn" onClick={() => setInvDetail(null)}>닫기</button>
            </div>
          ) : undefined
        }
      >
        {invDetail ? (
          <div>
            <div className="dsec">
              <div className="dsec-t">재고 요약</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, background: "var(--surface-2)", borderRadius: 8, padding: 16 }}>
                {[
                  { label: "보유 수량", val: invDetail.stocked_quantity, color: "var(--text)" },
                  { label: "예약 수량", val: invDetail.reserved_quantity, color: "var(--warning)" },
                  { label: "가용 수량", val: invDetail.stocked_quantity - invDetail.reserved_quantity,
                    color: invDetail.stocked_quantity - invDetail.reserved_quantity <= 0 ? "var(--danger)" : "var(--success)" },
                ].map((r) => (
                  <div key={r.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{r.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: r.color, marginTop: 4 }}>{r.val.toLocaleString("ko-KR")}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dsec">
              <div className="dsec-t">위치별 재고 조정</div>
              {stockLocations.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>창고 정보를 불러오는 중입니다…</p>
              ) : (
                <div className="table-wrap">
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>창고/위치</th>
                        <th className="num">보유</th>
                        <th className="num">예약</th>
                        <th className="num">가용</th>
                        <th className="num">수량 조정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLocations.map((loc) => {
                        const lv = invDetail.location_levels.find((l) => l.location_id === loc.id);
                        const stocked = lv?.stocked_quantity ?? 0;
                        const reserved = lv?.reserved_quantity ?? 0;
                        const avail = stocked - reserved;
                        return (
                          <tr key={loc.id}>
                            <td>
                              <div>{loc.name}</div>
                              {loc.address?.city && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{loc.address.city}</div>}
                            </td>
                            <td className="num strong">{stocked.toLocaleString("ko-KR")}</td>
                            <td className="num" style={{ color: "var(--warning)" }}>{reserved.toLocaleString("ko-KR")}</td>
                            <td className="num strong" style={{ color: avail <= 0 ? "var(--danger)" : "var(--success)" }}>{avail.toLocaleString("ko-KR")}</td>
                            <td className="num">
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                                <input
                                  type="number"
                                  min={0}
                                  className="ie-input"
                                  value={qtyDraft[loc.id] ?? String(stocked)}
                                  onChange={(e) => setQtyDraft((d) => ({ ...d, [loc.id]: e.target.value }))}
                                />
                                <button type="button" className="btn sm" disabled={invBusy} onClick={() => saveLocationQty(loc.id)}>저장</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

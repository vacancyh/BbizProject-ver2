/**
 * 상품 API 호출 레이어 — Medusa REST /admin/products 호출/래핑(로직 복사 X).
 * 가격은 variants[].prices(원가 price set)에서 표시. 통화 하드코딩 금지(currency_code 사용).
 */
import { apiFetch } from "./client";

export type ProductStatus = "published" | "draft" | "proposed" | "rejected";

export type VariantPrice = { amount: number; currency_code: string };

export type ProductVariant = {
  id: string;
  title: string | null;
  sku: string | null;
  prices?: VariantPrice[];
};

export type ProductListItem = {
  id: string;
  title: string;
  status: ProductStatus;
  thumbnail: string | null;
  handle: string;
  updated_at: string;
  categories?: { id: string; name: string }[];
  collection?: { id: string; title: string } | null;
  variants?: ProductVariant[];
};

export type ProductOption = { id: string; title: string; values?: { value: string }[] };

export type ProductDetail = ProductListItem & {
  subtitle: string | null;
  description: string | null;
  options?: ProductOption[];
  images?: { id: string; url: string }[];
  metadata?: Record<string, unknown> | null;
};

const LIST_FIELDS =
  "id,title,status,thumbnail,handle,updated_at,*categories,*collection," +
  "variants.id,variants.title,variants.sku,variants.prices.amount,variants.prices.currency_code";

const DETAIL_FIELDS =
  LIST_FIELDS +
  ",subtitle,description,metadata,*options,options.values.value,images.id,images.url";

export type ProductListParams = { q?: string; status?: string; category_id?: string; order?: string; limit?: number; offset?: number };

/** 상품 목록(Medusa REST). */
export function listProducts(
  params: ProductListParams = {}
): Promise<{ products: ProductListItem[]; count: number }> {
  const qs = new URLSearchParams({ fields: LIST_FIELDS });
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status[]", params.status);
  if (params.category_id) qs.set("category_id[]", params.category_id);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  qs.set("order", params.order || "-updated_at");
  return apiFetch(`/admin/products?${qs.toString()}`);
}

/** 상품 상세(Medusa REST). */
export function getProduct(id: string): Promise<{ product: ProductDetail }> {
  const qs = new URLSearchParams({ fields: DETAIL_FIELDS });
  return apiFetch(`/admin/products/${id}?${qs.toString()}`);
}

/** URL-safe handle 생성(한글 등은 제거 → 비면 timestamp 기반). */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `prod-${Date.now().toString(36)}`;
}

export type CreateProductInput = {
  title: string;
  status: ProductStatus;
  amount: number;
  currency_code: string;
  handle?: string;
};

/** 상품 등록(Medusa REST — 기본 옵션/변형 1개 + 가격). */
export function createProduct(input: CreateProductInput): Promise<{ product: ProductDetail }> {
  return apiFetch(`/admin/products`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      handle: input.handle || slugify(input.title),
      status: input.status,
      options: [{ title: "기본", values: ["기본"] }],
      variants: [
        {
          title: "기본",
          options: { 기본: "기본" },
          prices: [{ amount: input.amount, currency_code: input.currency_code }],
        },
      ],
    }),
  });
}

/** 상품 수정(상태/제목/부제/설명/handle/이미지). 판매중지 = status:"draft". */
export function updateProduct(
  id: string,
  patch: Partial<{
    status: ProductStatus;
    title: string;
    subtitle: string | null;
    description: string | null;
    handle: string;
    images: { url: string }[];
    metadata: Record<string, unknown>;
  }>
): Promise<{ product: ProductDetail }> {
  return apiFetch(`/admin/products/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** 변형 가격 편집(Medusa REST — 변형 prices 교체). */
export function updateVariantPrice(
  productId: string,
  variantId: string,
  prices: VariantPrice[]
): Promise<{ product: ProductDetail }> {
  return apiFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: "POST",
    body: JSON.stringify({ prices }),
  });
}

/** 변형들의 대표 판매가 표시용 — 지정 통화 우선, 없으면 첫 가격. */
export function representativePrice(
  variants: ProductVariant[] | undefined,
  preferred = "krw"
): VariantPrice | null {
  const prices: VariantPrice[] = [];
  for (const v of variants ?? []) for (const p of v.prices ?? []) prices.push(p);
  if (!prices.length) return null;
  const pref = prices.filter((p) => p.currency_code === preferred);
  const pool = pref.length ? pref : prices;
  return pool.reduce((min, p) => (p.amount < min.amount ? p : min), pool[0]);
}

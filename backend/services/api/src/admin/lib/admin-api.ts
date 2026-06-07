/**
 * Admin API fetch 헬퍼
 *
 * 새 의존성(js-sdk 등) 추가 없이, 같은 오리진의 메두사 `/admin` API 를
 * 세션 쿠키(credentials: include) 기반으로 호출합니다.
 * 관리자 화면(대시보드)과 API 는 동일 백엔드에서 서빙되므로 상대경로로 동작합니다.
 */

/** 공통 fetch 래퍼 — 실패 시 상태코드 + 본문을 담아 throw */
export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`/admin${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  })
  if (!res.ok) {
    let detail = ""
    try {
      detail = await res.text()
    } catch {
      /* noop */
    }
    throw new Error(`${res.status} ${res.statusText} — ${detail}`)
  }
  // 204 No Content 대응
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ===================== 타입 (필요한 필드만 최소 정의) ===================== */

export type ApiProductVariant = {
  id: string
  title: string
  sku: string | null
  inventory_quantity?: number
  prices?: { amount: number; currency_code: string }[]
}

export type ApiProductCategory = {
  id: string
  name: string
}

export type ApiProduct = {
  id: string
  title: string
  status: "draft" | "proposed" | "published" | "rejected"
  thumbnail: string | null
  variants?: ApiProductVariant[]
  categories?: ApiProductCategory[]
  updated_at: string
}

export type ProductTypeOption = {
  option_title: string
  option_values: string[]
  rank: number
}

export type DisclosureField = {
  field_key: string
  label: string
  required: boolean
  input_type: string
  sort_order: number
}

export type ProductType = {
  id: string
  parent_id: string | null
  name: string
  disclosure_code: string | null
  rank: number
  options: ProductTypeOption[]
  disclosure_fields: DisclosureField[]
  children?: ProductType[] // 판매 분야 노드에만 존재 (분류 목록)
}

/* ===================== 조회 ===================== */

/** 상품 목록 (variant·category 포함) */
export async function listProducts(params?: {
  q?: string
  limit?: number
  offset?: number
}): Promise<{ products: ApiProduct[]; count: number }> {
  const sp = new URLSearchParams()
  sp.set(
    "fields",
    "id,title,status,thumbnail,updated_at,*variants,*variants.prices,*categories"
  )
  sp.set("limit", String(params?.limit ?? 50))
  sp.set("offset", String(params?.offset ?? 0))
  if (params?.q) sp.set("q", params.q)
  return adminFetch(`/products?${sp.toString()}`)
}

/** 카테고리 목록 */
export async function listCategories(): Promise<{
  product_categories: ApiProductCategory[]
}> {
  return adminFetch(
    `/product-categories?fields=id,name,handle&limit=200`
  )
}

/** 상품유형 목록 (각 유형의 옵션 템플릿 포함) */
export async function listProductTypes(): Promise<{
  product_types: ProductType[]
}> {
  return adminFetch(`/product-types`)
}

/** 상품 생성에 필요한 기본값(판매채널·배송프로파일·통화) 한 번에 조회 */
export async function getCreateDefaults(): Promise<{
  salesChannelId: string | null
  shippingProfileId: string | null
  currencyCode: string
}> {
  const [sc, sp, store] = await Promise.all([
    adminFetch<{ sales_channels: { id: string }[] }>(
      `/sales-channels?limit=1`
    ).catch(() => ({ sales_channels: [] })),
    adminFetch<{ shipping_profiles: { id: string }[] }>(
      `/shipping-profiles?limit=1`
    ).catch(() => ({ shipping_profiles: [] })),
    adminFetch<{
      stores: { default_currency_code?: string; supported_currencies?: { currency_code: string; is_default?: boolean }[] }[]
    }>(`/stores?fields=id,default_currency_code,*supported_currencies`).catch(
      () => ({ stores: [] })
    ),
  ])

  const s = store.stores?.[0]
  const currencyCode =
    s?.default_currency_code ||
    s?.supported_currencies?.find((c) => c.is_default)?.currency_code ||
    s?.supported_currencies?.[0]?.currency_code ||
    "krw"

  return {
    salesChannelId: sc.sales_channels?.[0]?.id ?? null,
    shippingProfileId: sp.shipping_profiles?.[0]?.id ?? null,
    currencyCode,
  }
}

/* ===================== 생성 ===================== */

export type CreateProductInput = {
  title: string
  status: "draft" | "published"
  categoryId: string | null
  typeId?: string | null
  disclosure?: Record<string, string> // 상품정보고시 입력값 (field_key → value)
  options: { title: string; values: string[] }[]
  variants: {
    title: string
    sku?: string
    price: number
    options: Record<string, string>
  }[]
}

/**
 * 상품 handle 생성.
 * 메두사는 handle 미지정 시 title 로 자동 생성하는데, 한글 전용 상품명은
 * URL-safe 문자가 없어 빈 handle('-')이 되어 생성이 실패합니다.
 * 따라서 ASCII 슬러그를 만들고, 비면 고유 handle 로 대체합니다.
 */
function toHandle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (base.length > 0) return base
  return `prd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 상품 생성 — 메두사 /admin/products POST 페이로드로 변환해 호출 */
export async function createProduct(
  input: CreateProductInput,
  defaults: {
    salesChannelId: string | null
    shippingProfileId: string | null
    currencyCode: string
  }
): Promise<{ product: ApiProduct }> {
  const body: Record<string, unknown> = {
    title: input.title,
    handle: toHandle(input.title),
    status: input.status,
    // 한국형 메타: 상품유형 id + 상품정보고시 입력값 (코어 product.metadata 에 격리 저장)
    metadata: {
      kr_product_type_id: input.typeId ?? null,
      kr_disclosure: input.disclosure ?? {},
    },
    categories: input.categoryId ? [{ id: input.categoryId }] : undefined,
    options:
      input.options.length > 0
        ? input.options.map((o) => ({ title: o.title, values: o.values }))
        : [{ title: "기본", values: ["기본"] }],
    variants: input.variants.map((v) => ({
      title: v.title,
      sku: v.sku || undefined,
      manage_inventory: true,
      prices: [{ currency_code: defaults.currencyCode, amount: v.price }],
      options:
        Object.keys(v.options).length > 0 ? v.options : { 기본: "기본" },
    })),
    sales_channels: defaults.salesChannelId
      ? [{ id: defaults.salesChannelId }]
      : undefined,
    shipping_profile_id: defaults.shippingProfileId || undefined,
  }
  return adminFetch(`/products`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

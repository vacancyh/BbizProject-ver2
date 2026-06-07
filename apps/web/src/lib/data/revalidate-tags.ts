/**
 * 스토어프론트 ISR revalidate 계약 — 단일 출처(Single Source of Truth)
 *
 * §V0 재발방지: 캐시 태그 이름과 type→태그/경로 매핑을 한 곳에서만 정의한다.
 * 백엔드 subscriber(storefront-revalidate.ts) ↔ revalidate route(api/revalidate)
 * ↔ 데이터 fetch 레이어(cookies.ts getCacheOptions)가 모두 본 파일을 참조하므로,
 * 태그 스킴이 어긋나 revalidate 가 무효화되는 단절이 재발하지 않는다.
 *
 * ── 핵심 설계: 안정 태그(stable tag) ──────────────────────────────
 * 기존 Medusa 스타터는 캐시 태그를 `${base}-${cacheId}` 형태로 발급한다.
 * cacheId 는 방문자별 _medusa_cache_id 쿠키(crypto.randomUUID, 24h)라서
 * 서버 측 on-demand revalidateTag 가 그 값을 알 수 없다 → 절대 매칭 불가.
 *
 * 해결: fetch 시 방문자별 태그에 더해 **방문자 무관 안정 태그(base 그대로)**를
 * 함께 부착한다. revalidate route 는 안정 태그를 호출 → 전역 무효화 성립.
 */

/** 카탈로그 도메인 base 캐시 태그 — getCacheOptions 가 부착하는 안정 태그와 동일해야 한다. */
export const CATALOG_TAGS = {
  categories: "categories",
  products: "products",
  collections: "collections",
  productTags: "product-tags",
} as const

export type CatalogTagBase = (typeof CATALOG_TAGS)[keyof typeof CATALOG_TAGS]

/** revalidate 요청 type 값 — 백엔드 subscriber 의 RevalidatePayload["type"] 와 1:1 정합. */
export type RevalidateType =
  | "category"
  | "product"
  | "collection"
  | "tag"
  | "all"

/** type → 무효화할 안정 캐시 태그 목록 */
export const TYPE_TAG_MAP: Record<RevalidateType, CatalogTagBase[]> = {
  category: [CATALOG_TAGS.categories],
  product: [CATALOG_TAGS.products],
  collection: [CATALOG_TAGS.collections],
  tag: [CATALOG_TAGS.productTags],
  all: [
    CATALOG_TAGS.categories,
    CATALOG_TAGS.products,
    CATALOG_TAGS.collections,
    CATALOG_TAGS.productTags,
  ],
}

/**
 * type + handle → 무효화할 실제 URL 경로 목록.
 *
 * 주의(Next.js revalidatePath 규칙):
 *  - 라우트 그룹 `(main)` 은 URL 에 포함되지 않으므로 경로에서 제외한다.
 *  - 동적 경로는 리터럴 URL(예: /kr/categories/tops) 또는
 *    동적 세그먼트 패턴(예: /[countryCode]/categories/[...category]) 중
 *    하나로 지정해야 하며, 패턴 사용 시 type="page" 로 호출한다.
 *  - 본 함수는 패턴(전역) + handle 리터럴(단건) 두 가지를 모두 반환한다.
 *
 * @param type    revalidate 도메인
 * @param handle  단건 대상 핸들(있으면 리터럴 경로도 포함)
 * @param countryCode 단건 리터럴 경로용 국가코드(기본 kr — 한국 단독몰)
 */
export function pathsForRevalidate(
  type: RevalidateType,
  handle?: string,
  countryCode = "kr"
): string[] {
  const cc = countryCode.replace(/^\/|\/$/g, "")
  switch (type) {
    case "category": {
      const paths = [
        "/[countryCode]/categories/[...category]",
        "/[countryCode]/store",
      ]
      if (handle) paths.push(`/${cc}/categories/${handle}`)
      return paths
    }
    case "product": {
      const paths = [
        "/[countryCode]/products/[handle]",
        "/[countryCode]/store",
      ]
      if (handle) paths.push(`/${cc}/products/${handle}`)
      return paths
    }
    case "collection": {
      const paths = ["/[countryCode]/collections/[handle]"]
      if (handle) paths.push(`/${cc}/collections/${handle}`)
      return paths
    }
    case "tag":
      return ["/[countryCode]/store"]
    case "all":
      return ["/"]
    default:
      return []
  }
}

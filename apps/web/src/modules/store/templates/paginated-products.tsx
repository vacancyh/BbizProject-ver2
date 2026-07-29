import { HttpTypes } from "@medusajs/types"
import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { PRICE_RANGES } from "@modules/store/components/refinement-list/filter-config"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  searchQuery,
  categoryHandle,
  priceRange,
  countryCode,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  searchQuery?: string
  /** 카테고리 handle 필터(2026-07-29) */
  categoryHandle?: string
  /** 가격대 프리셋 키(2026-07-29) */
  priceRange?: string
  countryCode: string
}) {
  // 가격 필터는 서버가 "계산가 범위" 조건을 지원하지 않아 앱에서 걸러야 한다.
  // 페이지 단위로만 거르면 "2만원 이하" 상품이 2페이지에 있을 때 결과가 0건으로 보이므로,
  // 필터가 켜지면 넓게 조회(최대 100건)해서 전체에서 거른 뒤 직접 페이지네이션한다.
  const priceFilterActive = !!priceRange && priceRange !== "all"
  const queryParams: PaginatedProductsParams = {
    limit: priceFilterActive ? 100 : PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  // handle 로 넘어온 카테고리 필터 → id 로 변환해 서버 필터에 태운다.
  if (categoryHandle) {
    const cats = await listCategories({ handle: categoryHandle, limit: 1 }).catch(() => [])
    const found = (cats ?? [])[0]
    if (found?.id) {
      queryParams["category_id"] = [found.id]
    }
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  // 실제 백엔드 전문검색(q) — /store/products?q= 로 전달
  if (searchQuery) {
    queryParams["q"] = searchQuery
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
  })

  // 가격대 필터 — 계산가(최저 변형가) 기준으로 거른다.
  const range = PRICE_RANGES.find((r) => r.key === priceRange)
  const matchesPrice = (p: HttpTypes.StoreProduct) => {
    if (!range || range.key === "all") return true
    const amounts = (p.variants ?? [])
      .map((v) => v.calculated_price?.calculated_amount)
      .filter((n): n is number => typeof n === "number")
    if (!amounts.length) return false
    const min = Math.min(...amounts)
    if (range.min !== undefined && min < range.min) return false
    if (range.max !== undefined && min > range.max) return false
    return true
  }

  const matched = priceFilterActive ? products.filter(matchesPrice) : products

  // 필터가 켜져 있으면 걸러진 목록을 기준으로 페이지를 다시 계산한다.
  const effectiveCount = priceFilterActive ? matched.length : count
  const totalPages = Math.ceil(effectiveCount / PRODUCT_LIMIT)
  const priceFiltered = priceFilterActive
    ? matched.slice((page - 1) * PRODUCT_LIMIT, page * PRODUCT_LIMIT)
    : matched

  if (effectiveCount === 0) {
    return (
      <div
        className="py-24 text-center text-ui-fg-muted"
        data-testid="no-products-message"
      >
        {searchQuery
          ? `'${searchQuery}'에 대한 검색 결과가 없습니다.`
          : priceRange && priceRange !== "all"
          ? "선택한 조건에 맞는 상품이 없습니다. 필터를 변경해 보세요."
          : "표시할 상품이 없습니다."}
      </div>
    )
  }

  return (
    <>
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="products-list"
      >
        {priceFiltered.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}

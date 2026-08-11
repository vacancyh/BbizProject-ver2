import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import SearchSuggestions from "@modules/store/components/search-suggestions"
import { getT } from "@lib/i18n"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import {
  getPopularSearchTerms,
  recordSearchTerm,
} from "@lib/data/search-terms"
import { listCategories } from "@lib/data/categories"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  q,
  category,
  price,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  q?: string
  category?: string
  price?: string
  countryCode: string
}) => {
  const t = await getT()
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // 검색어가 있으면 집계 기록(비차단), 인기 검색어는 실집계로 조회.
  if (q?.trim()) {
    await recordSearchTerm(q)
  }
  const popularTerms = await getPopularSearchTerms(8)

  // 필터용 카테고리 목록(최상위만 — 사이드바가 길어지지 않게)
  const allCategories = await listCategories({ limit: 50 }).catch(() => [])
  const filterCategories = (allCategories ?? [])
    .filter((c) => !c.parent_category)
    .map((c) => ({ id: c.id, name: c.name, handle: c.handle }))

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} categories={filterCategories} />
      <div className="w-full">
        <div className="mb-8">
          <h1
            data-testid="store-page-title"
            className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base"
          >
            {q ? (
              <>
                <span className="text-ui-fg-interactive">{q}</span>
                {t("store.searchResultsSuffix")}
              </>
            ) : (
              t("store.title")
            )}
          </h1>
        </div>
        <SearchSuggestions currentQuery={q} popularTerms={popularTerms} />
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            searchQuery={q}
            categoryHandle={category}
            priceRange={price}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

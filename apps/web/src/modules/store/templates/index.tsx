import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import SearchSuggestions from "@modules/store/components/search-suggestions"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import {
  getPopularSearchTerms,
  recordSearchTerm,
} from "@lib/data/search-terms"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  q,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  q?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // 검색어가 있으면 집계 기록(비차단), 인기 검색어는 실집계로 조회.
  if (q?.trim()) {
    await recordSearchTerm(q)
  }
  const popularTerms = await getPopularSearchTerms(8)

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8">
          <h1
            data-testid="store-page-title"
            className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base"
          >
            {q ? (
              <>
                <span className="text-ui-fg-interactive">{q}</span> 검색 결과
              </>
            ) : (
              "전체 상품"
            )}
          </h1>
        </div>
        <SearchSuggestions currentQuery={q} popularTerms={popularTerms} />
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            searchQuery={q}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

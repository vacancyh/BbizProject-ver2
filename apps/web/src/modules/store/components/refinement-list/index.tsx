"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"
import ProductFilters from "./product-filters"
import type { FilterCategory } from "./filter-config"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  /** 카테고리 필터 목록(서버에서 주입) */
  categories?: FilterCategory[]
  'data-testid'?: string
}

const RefinementList = ({ sortBy, categories = [], 'data-testid': dataTestId }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`)
  }

  return (
    <div className="flex flex-col gap-y-10 py-4 mb-8 small:px-0 small:min-w-[220px] small:mr-8">
      <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
      <ProductFilters categories={categories} />
    </div>
  )
}

export default RefinementList

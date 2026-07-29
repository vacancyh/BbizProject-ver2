import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "전체 상품",
  description: "쇼핑몰의 모든 상품을 만나보세요.",
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    q?: string
    /** 카테고리 handle 필터(2026-07-29) */
    category?: string
    /** 가격대 프리셋 키(2026-07-29) */
    price?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, q, category, price } = searchParams

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      q={q}
      category={category}
      price={price}
      countryCode={params.countryCode}
    />
  )
}

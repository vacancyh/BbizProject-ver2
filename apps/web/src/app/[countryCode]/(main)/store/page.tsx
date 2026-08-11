import { getT } from "@lib/i18n"
import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("store.title"), description: t("store.metaDescription") }
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

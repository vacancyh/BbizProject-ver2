import { Metadata } from "next"
import { BIZ } from "@lib/business-info"
import { getT } from "@lib/i18n"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  const { collections } = await listCollections({
    fields: "*products",
  })

  if (!collections) {
    return []
  }

  const countryCodes = await listRegions().then(
    (regions: StoreRegion[]) =>
      regions
        ?.map((r) => r.countries?.map((c) => c.iso_2))
        .flat()
        .filter(Boolean) as string[]
  )

  const collectionHandles = collections.map(
    (collection: StoreCollection) => collection.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string) =>
      collectionHandles.map((handle: string | undefined) => ({
        countryCode,
        handle,
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  // ⚠️ 여기서 notFound() 를 부르면 안 된다. metadata 생성은 세그먼트 렌더 트리
  //    밖에서 일어나 not-found.tsx 가 아니라 **Next 기본 404**(헤더도 없는 맨 화면)가
  //    그려진다. 404 판정은 아래 페이지 컴포넌트가 한다(2026-08-12 수정).
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle).catch(() => null)

  if (!collection) {
    return { title: (await getT())("error.notFoundTitle") }
  }

  const metadata = {
    title: `${collection.title} | ${BIZ.name || (await getT())("biz.nameSample")}`,
    description: (await getT())("page.collectionMeta", { title: collection.title }),
  } as Metadata

  return metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const collection = await getCollectionByHandle(params.handle).then(
    (collection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
    />
  )
}

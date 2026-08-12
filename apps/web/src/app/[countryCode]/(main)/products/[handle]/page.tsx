import { Metadata } from "next"
import { BIZ } from "@lib/business-info"
import { getT } from "@lib/i18n"
import { ProductJsonLd } from "@modules/common/components/structured-data"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  // ⚠️ 여기서 notFound() 를 부르면 안 된다. metadata 생성은 세그먼트 렌더 트리
  //    밖에서 일어나 not-found.tsx 가 아니라 **Next 기본 404**(헤더도 없는 맨 화면)가
  //    그려진다. 404 판정은 아래 페이지 컴포넌트가 한다(2026-08-12 수정).
  const params = await props.params
  const { handle } = params
  const t = await getT()
  const region = await getRegion(params.countryCode)

  const product = region
    ? await listProducts({
        countryCode: params.countryCode,
        queryParams: { handle },
      })
        .then(({ response }) => response.products[0])
        .catch(() => undefined)
    : undefined

  if (!product) {
    return { title: t("error.notFoundTitle") }
  }

  return {
    title: `${product.title} | ${BIZ.name || (await getT())("biz.nameSample")}`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | ${BIZ.name || (await getT())("biz.nameSample")}`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  // 존재하지 않는 상품 → 404 (getImagesForVariant 전에 가드: 미존재 시 500 방지)
  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <>
      {/* SEO(2026-07-28): 구조화 데이터 — 검색 리치 결과(가격·재고·브레드크럼) */}
      <ProductJsonLd
        product={pricedProduct}
        countryCode={params.countryCode}
        currencyCode={region.currency_code}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images ?? []}
      />
    </>
  )
}

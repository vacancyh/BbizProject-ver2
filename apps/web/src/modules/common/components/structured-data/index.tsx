import { HttpTypes } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import { getProductPrice } from "@lib/util/get-product-price"

/**
 * 구조화 데이터(JSON-LD) — 검색 리치 결과용 (2026-07-28 신규)
 * 기존에는 구조화 데이터가 전혀 없었다(schema.org 마크업 0건).
 *
 * 주의: 표시 가격과 어긋나면 검색엔진 정책 위반이므로 값은 실제 계산 가격에서만 가져온다.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // 구조화 데이터는 서버에서 생성한 정적 객체만 직렬화한다(사용자 입력 없음)
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** 상품 상세 — Product + Offer + Breadcrumb */
export function ProductJsonLd({
  product,
  countryCode,
  currencyCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  currencyCode: string
}) {
  const base = getBaseURL()
  const url = `${base}/${countryCode}/products/${product.handle}`
  const { cheapestPrice } = getProductPrice({ product })
  const amount = cheapestPrice?.calculated_price_number

  const inStock = (product.variants ?? []).some(
    (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0 || v.allow_backorder
  )

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description ?? product.title,
          image: (product.images ?? []).map((i) => i.url).filter(Boolean).slice(0, 5),
          sku: product.variants?.[0]?.sku ?? undefined,
          url,
          ...(amount
            ? {
                offers: {
                  "@type": "Offer",
                  price: amount,
                  priceCurrency: currencyCode.toUpperCase(),
                  availability: inStock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                  url,
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: `${base}/${countryCode}` },
            { "@type": "ListItem", position: 2, name: "전체상품", item: `${base}/${countryCode}/store` },
            { "@type": "ListItem", position: 3, name: product.title, item: url },
          ],
        }}
      />
    </>
  )
}

/** 홈 — Organization + WebSite(사이트 검색) */
export function SiteJsonLd({ countryCode }: { countryCode: string }) {
  const base = getBaseURL()
  const name = process.env.NEXT_PUBLIC_APP_NAME_KO ?? process.env.NEXT_PUBLIC_APP_NAME ?? "쇼핑몰"

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name,
          url: base,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name,
          url: base,
          potentialAction: {
            "@type": "SearchAction",
            target: `${base}/${countryCode}/store?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
    </>
  )
}

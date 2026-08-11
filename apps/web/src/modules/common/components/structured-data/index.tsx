import { getT } from "@lib/i18n"
import { HttpTypes } from "@medusajs/types"
import { BIZ } from "@lib/business-info"
import { getBaseURL } from "@lib/util/env"
import { getProductPrice } from "@lib/util/get-product-price"

/**
 * 구조화 데이터(JSON-LD) — 검색 리치 결과용 (2026-07-28 신규)
 * 기존에는 구조화 데이터가 전혀 없었다(schema.org 마크업 0건).
 *
 * 주의: 표시 가격과 어긋나면 검색엔진 정책 위반이므로 값은 실제 계산 가격에서만 가져온다.
 */

/**
 * JSON-LD 직렬화 시 XSS 차단.
 *
 * `JSON.stringify` 는 `<`·`>` 를 이스케이프하지 않는다. 상품명·설명은 관리자 입력이므로
 * `</script><script>…` 같은 값이 들어오면 script 태그를 탈출해 **저장형 XSS** 가 된다.
 * HTML 파서가 태그로 인식하는 문자를 유니코드 이스케이프로 바꾼다(JSON 의미는 동일).
 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  )
}

/** 상품 상세 — Product + Offer + Breadcrumb */
export async function ProductJsonLd({
  product,
  countryCode,
  currencyCode,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  currencyCode: string
}) {
  const t = await getT()
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
            { "@type": "ListItem", position: 1, name: t("nav.home"), item: `${base}/${countryCode}` },
            { "@type": "ListItem", position: 2, name: t("store.title"), item: `${base}/${countryCode}/store` },
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
  const name =
    process.env.NEXT_PUBLIC_APP_NAME_KO ??
    process.env.NEXT_PUBLIC_APP_NAME ??
    BIZ.name ??
    ""

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

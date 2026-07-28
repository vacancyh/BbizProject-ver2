import { listProductsWithSort } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"

/** 신상품 홈 섹션 — 최신 등록순(created_at) 상위 8개. */
export default async function NewArrivals({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products },
  } = await listProductsWithSort({
    page: 1,
    sortBy: "created_at",
    countryCode: region.countries?.[0]?.iso_2 ?? "kr",
    queryParams: { limit: 8, fields: "*variants.calculated_price" },
  })

  if (!products?.length) return null

  return (
    <div className="content-container py-12 small:py-20" data-testid="new-arrivals">
      <div className="flex justify-between items-end mb-8">
        <Text className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base">
          신상품
        </Text>
        <InteractiveLink href="/store?sortBy=created_at">전체 보기</InteractiveLink>
      </div>
      <ul className="grid grid-cols-2 small:grid-cols-4 gap-x-4 gap-y-10 small:gap-y-12">
        {products.slice(0, 8).map((p) => (
          <li key={p.id}>
            <ProductPreview product={p} region={region} />
          </li>
        ))}
      </ul>
    </div>
  )
}

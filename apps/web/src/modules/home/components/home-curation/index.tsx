import { productGridClass } from "@modules/home/components/grid-cols"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import ProductPreview from "@modules/products/components/product-preview"
import { getCuratedProducts } from "@lib/data/curation"
import { getT } from "@lib/i18n"

/** MD 추천 홈 섹션 — 운영자가 어드민에서 지정한 큐레이션 상품. 없으면 미노출. */
export default async function HomeCuration({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const t = await getT()
  const products = await getCuratedProducts(region)
  if (!products.length) return null

  return (
    <div className="content-container py-12 small:py-20" data-testid="home-curation">
      <Text className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-8">
        {t("home.curation")}
      </Text>
      <ul className={productGridClass(products.length)}>
        {products.map((p) => (
          <li key={p.id}>
            <ProductPreview product={p} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </div>
  )
}

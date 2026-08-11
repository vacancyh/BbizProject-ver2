import { productGridClass } from "@modules/home/components/grid-cols"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import ProductPreview from "@modules/products/components/product-preview"
import { getBestProducts } from "@lib/data/best"
import { getT } from "@lib/i18n"

/**
 * 베스트(인기) 상품 홈 섹션.
 *  - 조회수 + 위시 랭킹 상위 상품(무비용 행동 신호 기반).
 *  - 데이터가 아직 없으면(신규 오픈 등) 미노출.
 */
export default async function BestProducts({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const t = await getT()
  const products = await getBestProducts(region, 8)
  if (!products.length) return null

  return (
    <div className="content-container py-12 small:py-20" data-testid="best-products">
      <div className="flex items-end justify-between mb-8">
        <Text className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base">
          {t("home.best")}
          <span className="ml-2 text-base font-normal text-ui-fg-subtle">
            {t("home.bestSubtitle")}
          </span>
        </Text>
      </div>
      <ul className={productGridClass(products.length)}>
        {products.map((p, i) => (
          <li key={p.id} className="relative">
            <span
              className="absolute z-10 top-2 left-2 flex items-center justify-center w-7 h-7 rounded-full bg-ui-fg-base text-ui-bg-base text-sm font-bold"
              aria-label={t("home.bestRankAria", { n: i + 1 })}
            >
              {i + 1}
            </span>
            <ProductPreview product={p} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </div>
  )
}

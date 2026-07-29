import { listActiveTimeSales } from "@lib/data/time-sales"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import Countdown from "./countdown"

const TimeSaleSection = async ({
  countryCode,
  region,
}: {
  countryCode: string
  region: HttpTypes.StoreRegion
}) => {
  const allSales = await listActiveTimeSales(countryCode)
  // 2026-07-29 수정: 상품이 붙지 않은 세일(삭제·미게시 상품 등)을 렌더 단계에서 건너뛰다 보니
  // **헤더만 남고 내용이 빈 섹션**이 홈 한가운데 생겼다. 섹션을 그리기 전에 걸러낸다.
  const sales = allSales.filter((s) => !!s.product)
  if (!sales.length) {
    return null
  }

  return (
    <div className="content-container py-12 small:py-20" data-testid="time-sale-section">
      <div className="flex items-center gap-x-2 mb-8">
        <span className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base">
          ⏱ 타임세일
        </span>
        <span className="text-small-regular text-ui-tag-red-text">
          한정 특가
        </span>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-4 gap-x-4 gap-y-10">
        {sales.map((s) => {
          if (!s.product) return null
          const { cheapestPrice } = getProductPrice({ product: s.product })
          const base = cheapestPrice?.calculated_price_number ?? 0
          const discounted =
            s.discount_type === "percentage"
              ? Math.round(base * (1 - s.discount_value / 100))
              : Math.max(0, base - s.discount_value)
          const badge =
            s.discount_type === "percentage"
              ? `${s.discount_value}%`
              : convertToLocale({
                  amount: s.discount_value,
                  currency_code: region.currency_code,
                })

          return (
            <li key={s.id}>
              <LocalizedClientLink
                href={`/products/${s.product.handle}`}
                className="group"
              >
                <div className="relative">
                  <span className="absolute top-2 left-2 z-10 bg-ui-tag-red-bg text-ui-tag-red-text text-small-regular font-semibold px-2 py-0.5 rounded-rounded">
                    {badge}↓
                  </span>
                  <div className="overflow-hidden">
                    <div className="transition-transform duration-300 ease-out group-hover:scale-[1.03]">
                      <Thumbnail
                        thumbnail={s.product.thumbnail}
                        images={s.product.images}
                        size="full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-y-1 mt-3">
                    <span className="text-sm text-ui-fg-base line-clamp-1">
                      {s.product.title}
                    </span>
                    <div className="flex items-center gap-x-2">
                      <span className="text-ui-tag-red-text font-semibold">
                        {convertToLocale({
                          amount: discounted,
                          currency_code: region.currency_code,
                        })}
                      </span>
                      {base > 0 && (
                        <span className="text-small-regular text-ui-fg-muted line-through">
                          {convertToLocale({
                            amount: base,
                            currency_code: region.currency_code,
                          })}
                        </span>
                      )}
                    </div>
                    <Countdown endsAt={s.ends_at} />
                  </div>
                </div>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TimeSaleSection

import { getT, getUiLocale } from "@lib/i18n"
import { formatDate } from "@lib/util/format-date"
import { clx } from "@modules/common/components/ui"
import { listMyCoupons } from "@lib/data/coupons"
import { convertToLocale } from "@lib/util/money"

const CouponList = async ({
  customerId,
  currencyCode,
}: {
  customerId: string
  currencyCode: string
}) => {
  const t = await getT()
  const locale = await getUiLocale()
  const { coupons, availableCount } = await listMyCoupons(customerId)

  return (
    <div className="w-full" data-testid="coupon-list">
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-8">
        <span className="text-base-regular text-ui-fg-muted">
          {t("coupon.availableTitle")}
        </span>
        <div className="text-3xl-semi mt-1">{t("coupon.countUnit", { n: availableCount })}</div>
      </div>

      {coupons.length === 0 ? (
        <p className="text-ui-fg-muted py-10 text-center text-base-regular">
          {t("coupon.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-y-3">
          {coupons.map((c) => {
            // 할인 표기는 **여기서** 만든다 — 백엔드가 완성된 한국어 문장을 주면
            // 영어 화면에서 바꿀 수가 없다(2026-08-11 수정).
            const benefit =
              c.discount_type === "percentage"
                ? t("coupon.percentOff", { value: c.discount_value })
                : convertToLocale({
                    amount: c.discount_value,
                    currency_code: c.currency_code ?? currencyCode,
                  })
            // 운영자가 캠페인 이름을 붙였으면 그 이름이 이긴다(운영자 의도 존중).
            const name = c.name ?? t("coupon.defaultName", { benefit })
            return (
            <li
              key={c.id}
              className={clx(
                "flex items-center justify-between border rounded-rounded p-5",
                c.used
                  ? "border-ui-border-base opacity-50"
                  : "border-ui-border-base"
              )}
              data-testid="coupon-row"
            >
              <div className="flex flex-col gap-y-1">
                <div className="flex items-center gap-x-2">
                  <span className="text-xl-semi text-ui-fg-base">{benefit}</span>
                  <span className="text-base-regular text-ui-fg-subtle">{name}</span>
                  {c.used && (
                    <span className="text-small-regular rounded-rounded bg-ui-bg-base text-ui-fg-muted px-2 py-0.5 border border-ui-border-base">
                      {t("coupon.used")}
                    </span>
                  )}
                </div>
                <span className="text-small-regular text-ui-fg-muted">
                  {c.min_order_amount > 0
                    ? `${convertToLocale({
                        amount: c.min_order_amount,
                        currency_code: currencyCode,
                      })} `
                    : ""}
                  {c.expires_at
                    ? t("coupon.until", { date: formatDate(locale, c.expires_at) })
                    : t("coupon.noExpiry")}
                </span>
              </div>
              <span className="text-small-regular text-ui-fg-subtle font-mono shrink-0">
                {c.code}
              </span>
            </li>
            )
          })}
        </ul>
      )}

      <p className="text-small-regular text-ui-fg-muted mt-6">
        {t("coupon.howTo")}
      </p>
      {/* TODO(backend): store 쿠폰함 API 연동 시 발급/다운로드 흐름 추가 */}
    </div>
  )
}

export default CouponList

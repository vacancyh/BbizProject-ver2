import { clx } from "@modules/common/components/ui"
import { listMyCoupons } from "@lib/data/coupons"
import { convertToLocale } from "@lib/util/money"

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso))
    : "무기한"

const CouponList = async ({
  customerId,
  currencyCode,
}: {
  customerId: string
  currencyCode: string
}) => {
  const { coupons, availableCount } = await listMyCoupons(customerId)

  return (
    <div className="w-full" data-testid="coupon-list">
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-8">
        <span className="text-base-regular text-ui-fg-muted">
          사용 가능한 쿠폰
        </span>
        <div className="text-3xl-semi mt-1">{availableCount}장</div>
      </div>

      {coupons.length === 0 ? (
        <p className="text-ui-fg-muted py-10 text-center text-base-regular">
          보유하신 쿠폰이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-y-3">
          {coupons.map((c) => (
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
                  <span className="text-xl-semi text-ui-fg-base">
                    {c.benefit}
                  </span>
                  <span className="text-base-regular text-ui-fg-subtle">
                    {c.name}
                  </span>
                  {c.used && (
                    <span className="text-small-regular rounded-rounded bg-ui-bg-base text-ui-fg-muted px-2 py-0.5 border border-ui-border-base">
                      사용 완료
                    </span>
                  )}
                </div>
                <span className="text-small-regular text-ui-fg-muted">
                  {c.min_order_amount > 0
                    ? `${convertToLocale({
                        amount: c.min_order_amount,
                        currency_code: currencyCode,
                      })} 이상 · `
                    : ""}
                  {c.expires_at ? `${formatDate(c.expires_at)}까지` : "기간 제한 없음"}
                </span>
              </div>
              <span className="text-small-regular text-ui-fg-subtle font-mono shrink-0">
                {c.code}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-small-regular text-ui-fg-muted mt-6">
        쿠폰 코드는 결제 단계의 &apos;프로모션 코드 입력&apos;에서 사용하실 수
        있습니다.
      </p>
      {/* TODO(backend): store 쿠폰함 API 연동 시 발급/다운로드 흐름 추가 */}
    </div>
  )
}

export default CouponList

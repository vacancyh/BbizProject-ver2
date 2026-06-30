import { clx } from "@modules/common/components/ui"

import { retrieveMembership } from "@lib/data/membership"
import { convertToLocale } from "@lib/util/money"

type MembershipTierProps = {
  customerId: string
  currencyCode: string
}

const MembershipTier = async ({
  customerId,
  currencyCode,
}: MembershipTierProps) => {
  const { membership, tiers, current, next, amount_to_next } =
    await retrieveMembership(customerId)

  // 다음 등급까지 진행률 (현재 등급 구간 내 비율)
  const progress = next
    ? Math.min(
        100,
        Math.round(
          ((membership.accrued_amount - current.min_amount) /
            (next.min_amount - current.min_amount)) *
            100
        )
      )
    : 100

  return (
    <div className="w-full" data-testid="membership-tier">
      {/* 현재 등급 요약 */}
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-8">
        <span className="text-base-regular text-ui-fg-muted">현재 등급</span>
        <div className="flex items-baseline gap-x-3 mt-1">
          <span className="text-3xl-semi" data-testid="current-tier">
            {membership.current_tier}
          </span>
          <span className="text-base-regular text-ui-fg-subtle">
            적립률 {current.earn_rate}%
          </span>
        </div>
        <div className="text-small-regular text-ui-fg-subtle mt-2">
          누적 구매액{" "}
          {convertToLocale({
            amount: membership.accrued_amount,
            currency_code: currencyCode,
          })}
        </div>

        {next ? (
          <div className="mt-5">
            <div className="flex justify-between text-small-regular text-ui-fg-subtle mb-2">
              <span>다음 등급 {next.tier}까지</span>
              <span>
                {convertToLocale({
                  amount: amount_to_next ?? 0,
                  currency_code: currencyCode,
                })}{" "}
                남음
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-ui-bg-base overflow-hidden">
              <div
                className="h-full bg-ui-fg-interactive"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-small-regular text-ui-fg-interactive mt-5">
            최고 등급입니다. 감사합니다!
          </p>
        )}
      </div>

      {/* 등급 기준표 */}
      <h2 className="text-large-semi mb-4">등급별 혜택</h2>
      <ul className="flex flex-col divide-y divide-ui-border-base">
        {tiers.map((tier) => {
          const isCurrent = tier.tier === membership.current_tier
          return (
            <li
              key={tier.tier}
              className={clx("flex flex-col gap-y-2 py-4 px-4 -mx-4", {
                "bg-ui-bg-subtle rounded-rounded": isCurrent,
              })}
              data-testid="tier-row"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <span className="text-base-semi">{tier.tier}</span>
                  {isCurrent && (
                    <span className="text-small-regular rounded-rounded bg-ui-tag-green-bg text-ui-tag-green-text px-2 py-0.5">
                      현재 등급
                    </span>
                  )}
                </div>
                <span className="text-small-regular text-ui-fg-subtle">
                  누적{" "}
                  {convertToLocale({
                    amount: tier.min_amount,
                    currency_code: currencyCode,
                  })}{" "}
                  이상 · 적립 {tier.earn_rate}%
                </span>
              </div>
              <span className="text-small-regular text-ui-fg-muted">
                {tier.benefits.join(" · ")}
              </span>
            </li>
          )
        })}
      </ul>

      {/* TODO(backend): store 등급 API 연동 시 등급 산정 기간/이력 표시 추가 */}
    </div>
  )
}

export default MembershipTier

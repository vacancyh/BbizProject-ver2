import { getT } from "@lib/i18n"
import { TIER_NAME_KEY } from "@lib/data/membership"
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
  const t = await getT()
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
        <span className="text-base-regular text-ui-fg-muted">{t("tier.current")}</span>
        <div className="flex items-baseline gap-x-3 mt-1">
          <span className="text-3xl-semi" data-testid="current-tier">
            {t(TIER_NAME_KEY[membership.current_tier])}
          </span>
          <span className="text-base-regular text-ui-fg-subtle">
            {t("tier.earnRate", { rate: current.earn_rate })}
          </span>
        </div>
        <div className="text-small-regular text-ui-fg-subtle mt-2">
          {t("tier.cumulative")}{" "}
          {convertToLocale({
            amount: membership.accrued_amount,
            currency_code: currencyCode,
          })}
        </div>

        {next ? (
          <div className="mt-5">
            <div className="flex justify-between text-small-regular text-ui-fg-subtle mb-2">
              <span>{t("tier.toNext", { tier: t(TIER_NAME_KEY[next.tier]) })}</span>
              <span>
                {convertToLocale({
                  amount: amount_to_next ?? 0,
                  currency_code: currencyCode,
                })}{" "}
                {t("tier.remaining")}
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
            {t("tier.highest")}
          </p>
        )}
      </div>

      {/* 등급 기준표 */}
      <h2 className="text-large-semi mb-4">{t("tier.benefitsTitle")}</h2>
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
                  <span className="text-base-semi">{t(TIER_NAME_KEY[tier.tier])}</span>
                  {isCurrent && (
                    <span className="text-small-regular rounded-rounded bg-ui-tag-green-bg text-ui-tag-green-text px-2 py-0.5">
                      {t("tier.currentBadge")}
                    </span>
                  )}
                </div>
                <span className="text-small-regular text-ui-fg-subtle">
                  {t("tier.threshold")}{" "}
                  {convertToLocale({
                    amount: tier.min_amount,
                    currency_code: currencyCode,
                  })}{" "}
                  {t("tier.thresholdSuffix", { rate: tier.earn_rate })}
                </span>
              </div>
              <span className="text-small-regular text-ui-fg-muted">
                {tier.benefits.map((b) => t(b)).join(" · ")}
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

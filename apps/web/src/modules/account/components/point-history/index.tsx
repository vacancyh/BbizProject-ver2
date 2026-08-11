import { getT, getUiLocale } from "@lib/i18n"
import type { MessageKey } from "@lib/i18n/messages"
import { formatDate } from "@lib/util/format-date"
import { clx } from "@modules/common/components/ui"

import { listCustomerPoints, type PointEntry } from "@lib/data/points"
import { convertToLocale } from "@lib/util/money"

const ENTRY_LABEL: Record<PointEntry["entry_type"], MessageKey> = {
  earn: "points.earn",
  redeem: "points.redeem",
  expire: "points.expire",
}

/**
 * 적립/사용 사유 → 표시 문구.
 *
 * 사유는 **시스템이 코드로 기록**한다(`purchase`·`signup`·`redeem`). 예전 데이터에는
 * 한국어 문장으로 들어간 것도 섞여 있어 둘 다 받는다.
 * 목록에 없는 값은 **원문 그대로** 보여 준다 — 운영자가 손으로 남긴 메모일 수 있다.
 */
const REASON_KEY: Record<string, MessageKey> = {
  purchase: "points.reason.purchase",
  signup: "points.reason.signup",
  redeem: "points.reason.redeem",
  "주문 적립금 사용": "points.reason.orderUse",
  "적립금 사용 취소": "points.reason.useCanceled",
  "환불 적립금 회수": "points.reason.refundClawback",
}

type PointHistoryProps = {
  customerId: string
  currencyCode: string
}

const PointHistory = async ({
  customerId,
  currencyCode,
}: PointHistoryProps) => {
  const t = await getT()
  const locale = await getUiLocale()
  const { entries, summary } = await listCustomerPoints(customerId)

  return (
    <div className="w-full" data-testid="point-history">
      {/* 보유 적립금 요약 */}
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-8">
        <span className="text-base-regular text-ui-fg-muted">
          {t("points.balance")}
        </span>
        <div className="text-3xl-semi mt-1" data-testid="point-balance">
          {convertToLocale({ amount: summary.balance, currency_code: currencyCode })}
        </div>
        <div className="flex gap-x-6 mt-4 text-small-regular text-ui-fg-subtle">
          <span>
            {t("points.totalEarned")}{" "}
            {convertToLocale({ amount: summary.total_earned, currency_code: currencyCode })}
          </span>
          <span>
            {t("points.totalUsed")}{" "}
            {convertToLocale({ amount: summary.total_used, currency_code: currencyCode })}
          </span>
        </div>
      </div>

      {/* 적립/사용 내역 */}
      <h2 className="text-large-semi mb-4">{t("points.historyTitle")}</h2>
      {entries.length === 0 ? (
        <p className="text-ui-fg-muted py-10 text-center text-base-regular">
          {t("points.empty")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ui-border-base">
          {entries.map((entry) => {
            const isPositive = entry.amount > 0
            return (
              <li
                key={entry.id}
                className="flex items-center justify-between py-4"
                data-testid="point-entry"
              >
                <div className="flex flex-col gap-y-1">
                  <div className="flex items-center gap-x-2">
                    <span
                      className={clx(
                        "text-small-regular rounded-rounded px-2 py-0.5",
                        {
                          "bg-ui-tag-green-bg text-ui-tag-green-text":
                            entry.entry_type === "earn",
                          "bg-ui-tag-blue-bg text-ui-tag-blue-text":
                            entry.entry_type === "redeem",
                          "bg-ui-tag-red-bg text-ui-tag-red-text":
                            entry.entry_type === "expire",
                        }
                      )}
                    >
                      {t(ENTRY_LABEL[entry.entry_type])}
                    </span>
                    <span className="text-base-regular">
                      {entry.reason && REASON_KEY[entry.reason]
                        ? t(REASON_KEY[entry.reason])
                        : entry.reason}
                    </span>
                  </div>
                  <span className="text-small-regular text-ui-fg-muted">
                    {formatDate(locale, entry.created_at)}
                    {entry.expires_at
                      ? t("points.expiresOn", { date: formatDate(locale, entry.expires_at) })
                      : ""}
                  </span>
                </div>
                <span
                  className={clx("text-base-semi shrink-0", {
                    "text-ui-fg-interactive": isPositive,
                    "text-ui-fg-muted": !isPositive,
                  })}
                >
                  {isPositive ? "+" : ""}
                  {convertToLocale({
                    amount: entry.amount,
                    currency_code: currencyCode,
                  })}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* TODO(backend): store 적립금 API 연동 시 페이지네이션/기간 필터 추가 */}
    </div>
  )
}

export default PointHistory

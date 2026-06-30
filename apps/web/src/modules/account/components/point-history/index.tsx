import { clx } from "@modules/common/components/ui"

import { listCustomerPoints, type PointEntry } from "@lib/data/points"
import { convertToLocale } from "@lib/util/money"

const ENTRY_LABEL: Record<PointEntry["entry_type"], string> = {
  earn: "적립",
  redeem: "사용",
  expire: "만료",
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))

type PointHistoryProps = {
  customerId: string
  currencyCode: string
}

const PointHistory = async ({
  customerId,
  currencyCode,
}: PointHistoryProps) => {
  const { entries, summary } = await listCustomerPoints(customerId)

  return (
    <div className="w-full" data-testid="point-history">
      {/* 보유 적립금 요약 */}
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-8">
        <span className="text-base-regular text-ui-fg-muted">
          보유 적립금
        </span>
        <div className="text-3xl-semi mt-1" data-testid="point-balance">
          {convertToLocale({ amount: summary.balance, currency_code: currencyCode })}
        </div>
        <div className="flex gap-x-6 mt-4 text-small-regular text-ui-fg-subtle">
          <span>
            누적 적립{" "}
            {convertToLocale({ amount: summary.total_earned, currency_code: currencyCode })}
          </span>
          <span>
            누적 사용{" "}
            {convertToLocale({ amount: summary.total_used, currency_code: currencyCode })}
          </span>
        </div>
      </div>

      {/* 적립/사용 내역 */}
      <h2 className="text-large-semi mb-4">적립/사용 내역</h2>
      {entries.length === 0 ? (
        <p className="text-ui-fg-muted py-10 text-center text-base-regular">
          아직 적립금 내역이 없습니다. 상품을 구매하시면 적립금이 쌓입니다.
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
                      {ENTRY_LABEL[entry.entry_type]}
                    </span>
                    <span className="text-base-regular">{entry.reason}</span>
                  </div>
                  <span className="text-small-regular text-ui-fg-muted">
                    {formatDate(entry.created_at)}
                    {entry.expires_at
                      ? ` · ${formatDate(entry.expires_at)} 만료`
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

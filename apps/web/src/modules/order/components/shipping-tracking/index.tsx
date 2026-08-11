import { getT, getUiLocale } from "@lib/i18n"
import { formatDateTime } from "@lib/util/format-date"
import type { UiLocale } from "@lib/i18n/messages"
import { Heading, Text } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

// 언어에 맞춰 표기한다(@lib/util/format-date). null 이면 빈 문자열.
const fmt = (locale: UiLocale, v?: string | Date | null) =>
  v
    ? formatDateTime(locale, v)
    : null

type TrackingLabel = { tracking_number?: string | null; tracking_url?: string | null }
type TrackingFulfillment = {
  id?: string
  labels?: TrackingLabel[]
  shipped_at?: string | Date | null
  delivered_at?: string | Date | null
  canceled_at?: string | Date | null
}

const ShippingTracking = async ({ order }: { order: HttpTypes.StoreOrder }) => {
  const t = await getT()
  const locale = await getUiLocale()
  const fulfillments = (order.fulfillments ?? []) as unknown as TrackingFulfillment[]

  return (
    <div data-testid="shipping-tracking">
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("tracking.title")}
      </Heading>

      {fulfillments.length === 0 ? (
        <Text className="txt-medium text-ui-fg-subtle">
          {t("tracking.preparing")}
        </Text>
      ) : (
        <ul className="flex flex-col gap-y-4">
          {fulfillments.map((f, idx) => {
            const labels = f.labels ?? []
            const shippedAt = fmt(locale, f.shipped_at)
            const deliveredAt = fmt(locale, f.delivered_at)
            const stage = f.canceled_at
              ? t("order.fulfillment.canceled")
              : f.delivered_at
              ? t("order.fulfillment.delivered")
              : f.shipped_at
              ? t("order.fulfillment.shipped")
              : t("order.fulfillment.fulfilled")
            return (
              <li
                key={f.id ?? idx}
                className="rounded-rounded border border-ui-border-base p-4"
                data-testid="fulfillment-row"
              >
                <div className="flex items-center justify-between">
                  <Text className="txt-medium-plus text-ui-fg-base">
                    {t("tracking.shipmentN", { n: idx + 1 })}
                  </Text>
                  <Text className="txt-small text-ui-fg-interactive">{stage}</Text>
                </div>
                {(shippedAt || deliveredAt) && (
                  <Text className="txt-small text-ui-fg-muted mt-1">
                    {shippedAt && t("tracking.shippedAt", { date: shippedAt })}
                    {shippedAt && deliveredAt && " · "}
                    {deliveredAt && t("tracking.deliveredAt", { date: deliveredAt })}
                  </Text>
                )}
                {labels.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-y-1">
                    {labels.map((l, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between txt-small"
                      >
                        <span className="text-ui-fg-subtle">
                          {t("tracking.trackingNo", { no: l.tracking_number ?? "-" })}
                        </span>
                        {l.tracking_url && (
                          <a
                            href={l.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ui-fg-interactive underline"
                          >
                            {t("tracking.track")}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text className="txt-small text-ui-fg-muted mt-2">
                    {t("tracking.waiting")}
                  </Text>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingTracking

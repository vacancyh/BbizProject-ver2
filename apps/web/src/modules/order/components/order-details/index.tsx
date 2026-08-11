import { getT, getUiLocale } from "@lib/i18n"
import { formatDate } from "@lib/util/format-date"
import { HttpTypes } from "@medusajs/types"
import type { MessageKey } from "@lib/i18n/messages"
import { Text } from "@modules/common/components/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

// 백엔드가 주는 상태 코드 → 번역 키.
// 문구를 여기 두면 영어 화면에도 한국어가 그대로 나간다(2026-08-10 전환).
// 모르는 코드가 오면 코드 원문을 그대로 보여 준다 — 빈칸보다 낫다.
const FULFILLMENT_STATUS_KEY: Record<string, MessageKey> = {
  not_fulfilled: "order.fulfillment.not_fulfilled",
  partially_fulfilled: "order.fulfillment.partially_fulfilled",
  fulfilled: "order.fulfillment.fulfilled",
  partially_shipped: "order.fulfillment.partially_shipped",
  shipped: "order.fulfillment.shipped",
  partially_delivered: "order.fulfillment.partially_delivered",
  delivered: "order.fulfillment.delivered",
  canceled: "order.fulfillment.canceled",
}

const PAYMENT_STATUS_KEY: Record<string, MessageKey> = {
  not_paid: "order.payment.not_paid",
  awaiting: "order.payment.awaiting",
  authorized: "order.payment.authorized",
  partially_authorized: "order.payment.partially_authorized",
  captured: "order.payment.captured",
  partially_captured: "order.payment.partially_captured",
  partially_refunded: "order.payment.partially_refunded",
  refunded: "order.payment.refunded",
  canceled: "order.payment.canceled",
  requires_action: "order.payment.requires_action",
}

const OrderDetails = async ({ order, showStatus }: OrderDetailsProps) => {
  const t = await getT()
  const locale = await getUiLocale()

  return (
    <div>
      <Text>
        {t("order.confirmationSentPre")}{" "}
        <span
          className="text-ui-fg-medium-plus font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>{" "}
        {t("order.confirmationSentPost")}
      </Text>
      <Text className="mt-2">
        {t("order.orderedAt")}{" "}
        <span data-testid="order-date">{formatDate(locale, order.created_at)}</span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        {t("order.orderNo")} <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              {t("order.fulfillmentStatus")}{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {FULFILLMENT_STATUS_KEY[order.fulfillment_status]
                  ? t(FULFILLMENT_STATUS_KEY[order.fulfillment_status])
                  : order.fulfillment_status}
              </span>
            </Text>
            <Text>
              {t("order.paymentStatus")}{" "}
              <span
                className="text-ui-fg-subtle "
                data-testid="order-payment-status"
              >
                {PAYMENT_STATUS_KEY[order.payment_status]
                  ? t(PAYMENT_STATUS_KEY[order.payment_status])
                  : order.payment_status}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails

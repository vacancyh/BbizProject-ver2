import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

// 관리자(백엔드)에서 변경되는 주문 상태를 한국어로 표기
const FULFILLMENT_STATUS_KO: Record<string, string> = {
  not_fulfilled: "배송 준비 중",
  partially_fulfilled: "부분 처리",
  fulfilled: "출고 준비 완료",
  partially_shipped: "부분 출고",
  shipped: "배송 중",
  partially_delivered: "부분 배송 완료",
  delivered: "배송 완료",
  canceled: "취소됨",
}

const PAYMENT_STATUS_KO: Record<string, string> = {
  not_paid: "미결제",
  awaiting: "입금 대기",
  authorized: "승인됨",
  partially_authorized: "부분 승인",
  captured: "결제 완료",
  partially_captured: "부분 결제",
  partially_refunded: "부분 환불",
  refunded: "환불 완료",
  canceled: "취소됨",
  requires_action: "확인 필요",
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatDate = (iso: string | Date) =>
    new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso))

  return (
    <div>
      <Text>
        주문 확인 내역을{" "}
        <span
          className="text-ui-fg-medium-plus font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>{" "}
        (으)로 보내드렸습니다.
      </Text>
      <Text className="mt-2">
        주문일:{" "}
        <span data-testid="order-date">{formatDate(order.created_at)}</span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        주문번호: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              배송 상태:{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {FULFILLMENT_STATUS_KO[order.fulfillment_status] ??
                  order.fulfillment_status}
              </span>
            </Text>
            <Text>
              결제 상태:{" "}
              <span
                className="text-ui-fg-subtle "
                data-testid="order-payment-status"
              >
                {PAYMENT_STATUS_KO[order.payment_status] ??
                  order.payment_status}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails

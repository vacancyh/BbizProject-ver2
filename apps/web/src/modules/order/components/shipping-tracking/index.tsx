import { Heading, Text } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const formatDateTime = (v?: string | Date | null) =>
  v
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(v))
    : null

const ShippingTracking = ({ order }: { order: HttpTypes.StoreOrder }) => {
  const fulfillments = (order.fulfillments ?? []) as any[]

  return (
    <div data-testid="shipping-tracking">
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        배송 추적
      </Heading>

      {fulfillments.length === 0 ? (
        <Text className="txt-medium text-ui-fg-subtle">
          상품을 준비 중입니다. 출고되면 송장번호로 배송 조회가 가능합니다.
        </Text>
      ) : (
        <ul className="flex flex-col gap-y-4">
          {fulfillments.map((f, idx) => {
            const labels: any[] = f.labels ?? []
            const shippedAt = formatDateTime(f.shipped_at)
            const deliveredAt = formatDateTime(f.delivered_at)
            const stage = f.canceled_at
              ? "취소됨"
              : f.delivered_at
              ? "배송 완료"
              : f.shipped_at
              ? "배송 중"
              : "출고 준비 완료"
            return (
              <li
                key={f.id ?? idx}
                className="rounded-rounded border border-ui-border-base p-4"
                data-testid="fulfillment-row"
              >
                <div className="flex items-center justify-between">
                  <Text className="txt-medium-plus text-ui-fg-base">
                    배송 {idx + 1}
                  </Text>
                  <Text className="txt-small text-ui-fg-interactive">{stage}</Text>
                </div>
                {(shippedAt || deliveredAt) && (
                  <Text className="txt-small text-ui-fg-muted mt-1">
                    {shippedAt && `출고 ${shippedAt}`}
                    {shippedAt && deliveredAt && " · "}
                    {deliveredAt && `배송완료 ${deliveredAt}`}
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
                          송장번호 {l.tracking_number ?? "-"}
                        </span>
                        {l.tracking_url && (
                          <a
                            href={l.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ui-fg-interactive underline"
                          >
                            배송 조회
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text className="txt-small text-ui-fg-muted mt-2">
                    송장 등록 대기 중
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

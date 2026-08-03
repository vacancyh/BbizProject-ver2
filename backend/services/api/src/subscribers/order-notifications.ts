/**
 * 주문 알림 구독자 — 2026-08-03 신설
 *
 * 배경: 점검 결과 **알림을 보내는 코드가 아예 없었다.** 주문이 들어와도 고객에게
 * 아무 연락이 가지 않았다. "SMS 업체만 계약하면 된다"가 아니라, 언제 무엇을
 * 보낼지 결정하고 호출하는 코드부터 필요했다. 이 파일이 그 층이다.
 *
 * 처리 이벤트
 *   order.placed    → 주문 접수
 *   order.canceled  → 주문 취소
 *
 * (발송·배송완료·환불 알림은 각 처리 라우트에서 직접 호출한다 —
 *  운송장 번호·환불금액 같은 값이 이벤트 payload 에 없기 때문이다)
 *
 * 원칙: **알림 실패가 주문 흐름을 막지 않는다.** 전부 try-catch 로 흡수한다.
 *       문자 한 통 때문에 주문이 깨지면 훨씬 큰 손해다.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { NOTIFICATION_KR_MODULE } from "../modules/notification-kr"
import type NotificationKrModuleService from "../modules/notification-kr/service"
import { formatKrw } from "../modules/notification-kr/logic"

/** 이벤트명 → 알림 시점 키 */
const EVENT_MAP: Record<string, string> = {
  "order.placed": "order.placed",
  "order.canceled": "order.canceled",
}

export default async function orderNotificationsHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = (() => {
    try {
      return container.resolve("logger") as any
    } catch {
      return console
    }
  })()

  try {
    const notifyEvent = EVENT_MAP[name]
    if (!notifyEvent) return

    const orderId = data?.id
    if (!orderId) return

    const query = container.resolve("query")
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "customer_id",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.phone",
      ],
      filters: { id: orderId },
    })
    const order = orders?.[0] as any
    if (!order) return

    const addr = order.shipping_address ?? {}
    // 수신처: 배송지 연락처 우선(주문자와 수령인이 다를 수 있다), 없으면 주문 이메일.
    const phone = addr.phone ? String(addr.phone) : ""
    const recipient = phone || String(order.email ?? "")
    if (!recipient) return

    const svc = container.resolve(
      NOTIFICATION_KR_MODULE
    ) as unknown as NotificationKrModuleService

    const result = await svc.notify(
      notifyEvent,
      recipient,
      {
        shop_name: process.env.APP_NAME_KO || process.env.APP_NAME || "쇼핑몰",
        customer_name: [addr.last_name, addr.first_name].filter(Boolean).join("") || "고객",
        order_no: order.display_id ?? order.id,
        total: formatKrw(order.total),
      },
      {
        order_id: order.id,
        customer_id: order.customer_id ?? null,
        channel: phone ? "sms" : "email",
      }
    )

    // 발송 결과를 로그에 남긴다 — provider 미연동 상태에서는 "logged" 가 정상이다.
    logger.info?.(
      `[order-notifications] ${notifyEvent} order=${order.display_id ?? order.id} → ${result.status}` +
        (result.reason ? ` (${result.reason})` : "")
    )
  } catch (e: any) {
    // 알림 실패가 주문 이벤트 처리를 막지 않도록 흡수
    logger.error?.(
      `[order-notifications] 알림 처리 실패(event=${name}, order=${data?.id}): ${e?.message ?? e}`
    )
  }
}

export const config: SubscriberConfig = {
  event: Object.keys(EVENT_MAP),
}

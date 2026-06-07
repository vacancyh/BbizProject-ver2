/**
 * order.delivered 이벤트 구독자
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ① (인도일 기산)
 *
 * 동작:
 *  - 메두사 order.delivered 이벤트 수신 시 calculateEligibility 자동 호출
 *  - delivered_at = 현재 시각 (이벤트 페이로드에 delivered_at 이 있으면 그 값 사용)
 *  - WithdrawalEligibility 레코드 자동 생성 (eligible_until = delivered_at + 7 일)
 *
 * 메두사 v2 의 이벤트 명세에 따라 페이로드는 `{ id }` 형태로 가정합니다 (메두사_..._events-and-subscribers_page.mdx 참조).
 * 만약 실제 페이로드가 `{ id, delivered_at }` 이면 그 값을 우선 사용합니다.
 */
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { WITHDRAWAL_7DAY_MODULE } from ".."
import WithdrawalSevenDayModuleService from "../service"

type OrderDeliveredPayload = {
  id: string
  delivered_at?: string | Date
}

export default async function orderDeliveredHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderDeliveredPayload>) {
  const logger = container.resolve("logger")

  // withdrawal7Day 모듈 서비스 해석 (WITHDRAWAL_7DAY_MODULE = "withdrawal7Day")
  const withdrawalService = container.resolve<
    WithdrawalSevenDayModuleService
  >(WITHDRAWAL_7DAY_MODULE)

  // 인도일 = 페이로드 우선, 없으면 현재 시각
  const deliveredAt = data.delivered_at
    ? new Date(data.delivered_at)
    : new Date()

  try {
    const eligibility = await withdrawalService.calculateEligibility(
      data.id,
      deliveredAt
    )
    logger.info(
      `[withdrawal7Day] 청약철회 가능 레코드 생성 완료. order_id=${data.id}, eligible_until=${eligibility.eligible_until}`
    )
  } catch (err) {
    logger.error(
      `[withdrawal7Day] 청약철회 가능 레코드 생성 실패. order_id=${data.id}, error=${(err as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.delivered",
}

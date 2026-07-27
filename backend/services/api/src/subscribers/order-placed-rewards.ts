/**
 * 주문 완료 자동 리워드 구독자 (d5 t004 멤버십 + t005 포인트 갭B 후속).
 *
 * 역할: 주문이 확정(`order.placed`)되면 해당 주문의 고객에게
 *       ① 멤버십 누적금액 증가(등급 자동 재산정) + ② 구매 포인트 적립 을 자동 수행한다.
 *
 * 배경: 기존 멤버십 누적/포인트 적립은 Admin route(수동) 로만 가능했고,
 *       주문완료 이벤트 자동 누적은 갭B 후속(deferred) 로 남아 있었다(accrual route 주석 참조).
 *       본 구독자가 그 자동화 레이어를 채운다.
 *
 * 가드레일(§V0 / Rule One):
 *  - Medusa core(order/customer) 미수정 — query.graph 로 읽기만, 누적/적립은 우리 모듈에 위임.
 *  - 등급 정책/적립률/유효기간은 코드에 박지 않고 policy 모듈에서 조회하여 주입.
 *  - 적립 실패가 주문 흐름(이벤트 처리)을 막지 않도록 전체 try-catch.
 *
 * ✅ 멱등성(구현 완료):
 *  - point_accrual_log 테이블의 UNIQUE(order_id, reason) 인덱스로 중복 적립 차단.
 *  - earnFromPurchaseIdempotent() 호출 시 동일 주문은 skip 반환(DB 레벨 보장).
 *  - 멤버십 누적(recordAccrual)은 별도 구독 이벤트 재발행 차단 없음 — 향후 보강 deferred.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { POLICY_MODULE } from "../modules/policy"
import type PolicyModuleService from "../modules/policy/service"
import { MEMBERSHIP_MODULE } from "../modules/membership"
import type MembershipModuleService from "../modules/membership/service"
import {
  DEFAULT_TIERS,
  parseTiersPolicy,
  calcMembershipTier,
} from "../modules/membership/logic"
import { CUSTOMER_POINT_MODULE } from "../modules/customer-point"
import type CustomerPointModuleService from "../modules/customer-point/service"

/** 포인트 유효기간 폴백(일) — point.expire_months 미설정 시 사용(12개월 ≈ 360일). */
const DEFAULT_VALID_DAYS = 360

/**
 * 숫자 정규화 — Medusa total/item_total 은 number 이거나 numeric(string) 일 수 있어
 * 안전하게 number 로 변환한다(NaN 은 0 처리, 음수 방지).
 */
function toAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export default async function orderPlacedRewardsHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const orderId = data?.id
    if (!orderId) return

    // 주문 조회(읽기 전용) — core 미수정, 필요한 필드만.
    const query = container.resolve("query")
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "total", "item_total", "currency_code"],
      filters: { id: orderId },
    })
    const order = orders?.[0]
    if (!order) return

    // 비회원(게스트) 주문은 누적/적립 대상 아님.
    const customerId = order.customer_id
    if (!customerId) return

    // 적립 기준 금액 = 상품금액(item_total) 우선, 없으면 주문 총액(total).
    const amount = toAmount(order.item_total) || toAmount(order.total)
    if (amount <= 0) return

    const policy = container.resolve(POLICY_MODULE) as unknown as PolicyModuleService
    const membership = container.resolve(MEMBERSHIP_MODULE) as unknown as MembershipModuleService
    const point = container.resolve(CUSTOMER_POINT_MODULE) as unknown as CustomerPointModuleService

    // ① 등급 정책(tiers) 조회 — 없으면 모듈 폴백.
    const tiersRow = await policy.get("membership.tiers")
    const tiers = tiersRow ? parseTiersPolicy(tiersRow.value) : DEFAULT_TIERS

    // ② 멤버십 누적 증가 + 등급 재산정(upsert). 결과 누적액 기준으로 적립률 산출.
    const snapshot = await membership.recordAccrual(customerId, amount, tiers)
    const earnRate = calcMembershipTier(snapshot.accrued_amount, tiers).earnRate

    // ③ 포인트 유효기간(일) — point.expire_months(개월) × 30, 미설정 시 폴백.
    const expireRow = await policy.get("point.expire_months")
    const months = typeof expireRow?.value === "number" ? expireRow.value : null
    const validDays = months && months > 0 ? months * 30 : DEFAULT_VALID_DAYS

    // ④ 구매 포인트 적립 — 멱등 버전 사용(동일 orderId+reason 재적립 차단).
    //    point_accrual_log UNIQUE(order_id, reason) 인덱스로 DB 레벨 보장.
    const accrualResult = await point.earnFromPurchaseIdempotent(
      customerId,
      orderId,
      amount,
      earnRate,
      validDays,
      "purchase"
    )
    if (accrualResult.skipped) {
      const logger = (() => {
        try { return container.resolve("logger") } catch { return console }
      })()
      logger.info?.(
        `[order-placed-rewards] 이미 처리된 주문 — 포인트 적립 skip(order=${orderId})`
      )
    }
  } catch (e: any) {
    // 적립 실패가 주문 흐름을 막지 않도록 로깅만 하고 흡수한다(§V0 가드레일).
    const logger = (() => {
      try {
        return container.resolve("logger")
      } catch {
        return console
      }
    })()
    logger.error?.(
      `[order-placed-rewards] 자동 멤버십/포인트 적립 실패(order=${data?.id}): ${e?.message ?? e}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

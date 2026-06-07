/**
 * 청약철회 자격 조회 Admin API (한국 전자상거래법 §17 ① 래핑)
 *
 *  - GET /admin/withdrawal/:orderId
 *      ① withdrawal7Day 모듈의 eligibility 레코드 조회(인도일 + 7일 마감)
 *      ② isWithdrawable 로 현재 시각 기준 철회 가능 여부 판정
 *      ③ 신청 이력이 있으면 환불 SLA(영업일 3일, §18 ①) 마감일 동봉
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WITHDRAWAL_7DAY_MODULE } from "../../../../modules/legal-kr/withdrawal-7day"
import WithdrawalSevenDayModuleService from "../../../../modules/legal-kr/withdrawal-7day/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.orderId
  const svc = req.scope.resolve(
    WITHDRAWAL_7DAY_MODULE
  ) as unknown as WithdrawalSevenDayModuleService

  // ① 자격 레코드 조회(없으면 = 배송 미완료 등 → 대상 아님)
  const eligibilities = await svc.listWithdrawalEligibilities({
    order_id: orderId,
  })
  const eligibility = eligibilities[0] ?? null

  // ② 현재 시각 기준 철회 가능 여부
  const eligible = await svc.isWithdrawable(orderId)

  // ③ 신청 이력 + 환불 SLA(있을 때만)
  const claims = await svc.listWithdrawalReasonRecords(
    { order_id: orderId },
    { order: { claimed_at: "DESC" } }
  )
  const claimed = claims[0] ?? null

  let refundSla: Date | null = null
  if (claimed) {
    try {
      refundSla = await svc.requireBusinessDayRefundSLA(orderId)
    } catch {
      refundSla = null
    }
  }

  res.json({
    eligible,
    eligibility,
    deadline: eligibility?.eligible_until ?? null,
    claimed,
    refund_sla: refundSla,
  })
}

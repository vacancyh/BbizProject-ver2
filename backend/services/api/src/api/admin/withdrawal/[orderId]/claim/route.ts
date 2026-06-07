/**
 * 청약철회 신청 Admin API (한국 전자상거래법 §17 ① / §18 ① 래핑)
 *
 *  - POST /admin/withdrawal/:orderId/claim   { reason, description?, confirm: true }
 *      ① 이중확인(confirm=true) 필수
 *      ② withdrawal7Day 모듈 claimWithdrawal 호출(사유 검증 + 기간 검증 + 레코드 생성)
 *      ③ 단순변심(simple_change)은 자동 승인 처리(서비스 책임)
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WITHDRAWAL_7DAY_MODULE } from "../../../../../modules/legal-kr/withdrawal-7day"
import WithdrawalSevenDayModuleService from "../../../../../modules/legal-kr/withdrawal-7day/service"
import type { WithdrawalReasonCode } from "../../../../../modules/legal-kr/withdrawal-7day/models/withdrawal-reason"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    reason?: WithdrawalReasonCode
    description?: string
    confirm?: boolean
  }

  if (body.confirm !== true) {
    res
      .status(409)
      .json({ message: "청약철회 신청에는 이중확인(confirm=true)이 필요합니다." })
    return
  }
  if (!body.reason) {
    res.status(400).json({ message: "청약철회 사유(reason)가 필요합니다." })
    return
  }

  const orderId = req.params.orderId
  const svc = req.scope.resolve(
    WITHDRAWAL_7DAY_MODULE
  ) as unknown as WithdrawalSevenDayModuleService

  try {
    const record = await svc.claimWithdrawal(
      orderId,
      body.reason,
      body.description
    )
    res.json({ claimed: true, record })
  } catch (e) {
    // 사유 오류 / 기간 초과 = 422 (서비스가 던진 메시지 전달)
    res.status(422).json({ message: (e as Error).message })
  }
}

/**
 * 회원 탈퇴 Store API (로그인 고객 본인)
 *  - POST /store/customers/me/withdraw → 본인 계정 소프트 삭제(주문 이력 보존 위해 soft delete)
 * 인증: 스토어 고객 세션/Bearer. 탈퇴 후 프런트는 로그아웃 처리.
 * ※ 개인정보는 관계 법령 보존기간 경과 후 파기(운영 정책). soft delete = deleted_at 설정.
 * 가드레일: Medusa core 미수정(customer 모듈 표준 soft delete 사용).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  await customerModule.softDeleteCustomers([customerId])

  res.json({ withdrawn: true })
}

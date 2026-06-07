/**
 * 고객 제재 조회/적용/해제 Admin API
 *
 *  - GET    /admin/sanctions/customers/:id   현재 제재 상태 + 로그인 차단 판정
 *  - POST   /admin/sanctions/customers/:id   body={reason} 제재 단계 상승 적용
 *  - DELETE /admin/sanctions/customers/:id   최신 활성 제재 해제
 *
 * 단계 전이/차단 룰은 모듈 service(logic 위임). 진행중 주문 강제취소 연동은 deferred.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_SANCTION_MODULE } from "../../../../../modules/customer-sanction"
import CustomerSanctionModuleService from "../../../../../modules/customer-sanction/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_SANCTION_MODULE) as unknown as CustomerSanctionModuleService
  const status = await svc.getCurrent(req.params.id, new Date().toISOString())
  res.json({ sanction: status })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_SANCTION_MODULE) as unknown as CustomerSanctionModuleService
  const body = (req.body ?? {}) as { reason?: string }
  const row = await svc.applySanction(
    req.params.id,
    body.reason ?? "관리자 제재",
    new Date().toISOString()
  )
  res.status(200).json({ sanction: row })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_SANCTION_MODULE) as unknown as CustomerSanctionModuleService
  const row = await svc.liftSanction(req.params.id)
  if (!row) {
    res.status(404).json({ message: "해제할 활성 제재가 없습니다." })
    return
  }
  res.status(200).json({ sanction: row, lifted: true })
}

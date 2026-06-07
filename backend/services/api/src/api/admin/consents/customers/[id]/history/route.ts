/**
 * 고객 동의 이력(시각 타임라인) 조회 Admin API
 *
 *  - GET /admin/consents/customers/:id/history  전체 동의/철회 이력(시점 포함)
 *
 * 기존 GET /admin/consents/customers/:id (getStatus = 채널별 현재 상태)는 건드리지 않고,
 * append-only consent_log 의 전체 타임라인을 그대로 노출한다.
 * 최신/재확인 판정 로직은 백엔드 logic.ts 단일 진실 — 여기선 service.getRecords 만 호출(재구현 금지).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_CONSENT_MODULE } from "../../../../../../modules/customer-consent"
import CustomerConsentModuleService from "../../../../../../modules/customer-consent/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_CONSENT_MODULE) as unknown as CustomerConsentModuleService
  const records = await svc.getRecords(req.params.id)
  res.json({ records })
}

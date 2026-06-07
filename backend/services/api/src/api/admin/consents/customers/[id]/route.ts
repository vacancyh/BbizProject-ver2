/**
 * 고객 동의 이력 조회/기록 Admin API
 *
 *  - GET  /admin/consents/customers/:id   채널별 현재 동의 + 재확인 필요 채널
 *  - POST /admin/consents/customers/:id   body={channel, agreed} 동의/철회 기록
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_CONSENT_MODULE } from "../../../../../modules/customer-consent"
import CustomerConsentModuleService from "../../../../../modules/customer-consent/service"
import { ALL_CONSENT_CHANNELS, type ConsentChannel } from "../../../../../modules/customer-consent/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_CONSENT_MODULE) as unknown as CustomerConsentModuleService
  const status = await svc.getStatus(req.params.id, new Date().toISOString())
  res.json(status)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(CUSTOMER_CONSENT_MODULE) as unknown as CustomerConsentModuleService
  const body = (req.body ?? {}) as { channel?: string; agreed?: boolean }

  if (!body.channel || !ALL_CONSENT_CHANNELS.includes(body.channel as ConsentChannel)) {
    res.status(400).json({ message: `channel 은 ${ALL_CONSENT_CHANNELS.join("/")} 중 하나여야 합니다.` })
    return
  }
  if (typeof body.agreed !== "boolean") {
    res.status(400).json({ message: "agreed(boolean)가 필요합니다." })
    return
  }

  const row = await svc.recordConsent(
    req.params.id,
    body.channel as ConsentChannel,
    body.agreed,
    new Date().toISOString()
  )
  res.status(200).json({ consent: row })
}

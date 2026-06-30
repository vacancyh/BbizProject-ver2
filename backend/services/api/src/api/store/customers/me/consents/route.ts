/**
 * 내 마케팅 수신 동의 Store API (로그인 고객 전용)
 *  - GET  /store/customers/me/consents → 채널별 현재 동의 상태(marketing/sms/email)
 *  - POST /store/customers/me/consents { channel, agreed } → 동의/철회 1행 적재(append-only)
 * 인증: 스토어 고객 세션/Bearer(req.auth_context.actor_id = customer.id).
 * 가드레일: Medusa core 미수정. customer-consent 모듈 전용 테이블(consent_log)만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_CONSENT_MODULE } from "../../../../../modules/customer-consent"
import type CustomerConsentModuleService from "../../../../../modules/customer-consent/service"

const CHANNELS = ["marketing", "sms", "email"] as const
type Channel = (typeof CHANNELS)[number]

function shape(consents: Record<string, boolean>) {
  return {
    marketing: !!consents.marketing,
    sms: !!consents.sms,
    email: !!consents.email,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.json({ consents: { marketing: false, sms: false, email: false } })
    return
  }
  const svc = req.scope.resolve(
    CUSTOMER_CONSENT_MODULE
  ) as unknown as CustomerConsentModuleService
  const { consents } = await svc.getStatus(
    customerId,
    new Date().toISOString(),
    CHANNELS as unknown as any[]
  )
  res.json({ consents: shape(consents) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const body = (req.body ?? {}) as { channel?: string; agreed?: boolean }
  if (!body.channel || !CHANNELS.includes(body.channel as Channel)) {
    res.status(400).json({ message: "channel은 marketing/sms/email 중 하나여야 합니다." })
    return
  }
  const svc = req.scope.resolve(
    CUSTOMER_CONSENT_MODULE
  ) as unknown as CustomerConsentModuleService

  await svc.recordConsent(
    customerId,
    body.channel as any,
    !!body.agreed,
    new Date().toISOString()
  )

  const { consents } = await svc.getStatus(
    customerId,
    new Date().toISOString(),
    CHANNELS as unknown as any[]
  )
  res.json({ consents: shape(consents) })
}

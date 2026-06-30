/**
 * 재입고 알림 신청 Store API
 *  - POST /store/restock-notifications { variant_id, product_id?, email }
 *    → 품절 변형 재입고 시 알림받을 구독 등록(동일 variant+email 중복 무시).
 * 로그인 고객이면 customer_id 자동 연결(req.auth_context.actor_id).
 * 가드레일: Medusa core 미수정. restock-notification 모듈 전용 테이블만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTOCK_NOTIFICATION_MODULE } from "../../../modules/restock-notification"
import type RestockNotificationModuleService from "../../../modules/restock-notification/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    variant_id?: string
    product_id?: string
    email?: string
  }
  const email = (body.email ?? "").trim()
  if (!body.variant_id || !email) {
    res.status(400).json({ message: "variant_id 와 email 은 필수입니다." })
    return
  }
  // 간단한 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "올바른 이메일 주소를 입력해 주세요." })
    return
  }

  const customerId = (req as any).auth_context?.actor_id ?? null

  const svc = req.scope.resolve(
    RESTOCK_NOTIFICATION_MODULE
  ) as unknown as RestockNotificationModuleService

  await svc.subscribe({
    variant_id: body.variant_id,
    product_id: body.product_id ?? null,
    email,
    customer_id: customerId,
  })

  res.status(201).json({ subscribed: true })
}

/**
 * 반품 정책 조회 Admin API (RMA Extension 모듈 래핑)
 *
 *  - GET /admin/rma/policy?store_id=...
 *      활성 반품 정책 1건(반품 가능 기간 · 재입고 수수료 · 기본 배송비 부담주체)을 반환.
 *      store_id 미지정 시 활성 정책 최신 1건을 반환(미존재 시 policy=null, 404 던지지 않음).
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RMA_EXTENSION_MODULE } from "../../../../modules/rma-extension"
import RmaExtensionModuleService from "../../../../modules/rma-extension/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeId = (req.query.store_id as string | undefined) ?? null
  const svc = req.scope.resolve(
    RMA_EXTENSION_MODULE
  ) as unknown as RmaExtensionModuleService

  let policy: any = null
  try {
    if (storeId) {
      policy = await svc.getReturnsPolicy(storeId)
    } else {
      const list = await svc.listReturnsPolicies(
        { active: true },
        { take: 1, order: { created_at: "DESC" } }
      )
      policy = list[0] ?? null
    }
  } catch {
    // 정책 미설정 = UI 에서 섹션 숨김 처리(에러 아님)
    policy = null
  }

  res.json({ policy })
}

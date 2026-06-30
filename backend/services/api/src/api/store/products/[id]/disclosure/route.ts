/**
 * 상품정보고시 Store API (전자상거래법 「상품정보제공고시」 노출용)
 *  - GET /store/products/:id/disclosure → 현행(published 최신) 고시 항목(키-값)
 * 가드레일: Medusa core 미수정. product-disclosure 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_DISCLOSURE_MODULE } from "../../../../../modules/product-disclosure"
import type ProductDisclosureModuleService from "../../../../../modules/product-disclosure/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const svc = req.scope.resolve(
    PRODUCT_DISCLOSURE_MODULE
  ) as unknown as ProductDisclosureModuleService

  const active = await svc.getActiveDisclosure(productId)
  if (!active) {
    res.json({ disclosure: null })
    return
  }

  let fields: Record<string, string> = {}
  try {
    const parsed = JSON.parse(active.fields_json as string)
    if (parsed && typeof parsed === "object") {
      fields = parsed as Record<string, string>
    }
  } catch {
    fields = {}
  }

  res.json({
    disclosure: {
      product_id: productId,
      version: active.version,
      fields,
    },
  })
}

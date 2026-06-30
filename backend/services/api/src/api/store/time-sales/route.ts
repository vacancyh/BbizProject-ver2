/**
 * 타임세일 Store API
 *  - GET /store/time-sales → 현재 진행 중(active)인 타임세일 목록
 * time-sale 모듈 listActiveSales(now) — 시간창(starts_at~ends_at) 기준 재판정.
 * 가드레일: Medusa core 미수정. time-sale 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TIME_SALE_MODULE } from "../../../modules/time-sale"
import type TimeSaleModuleService from "../../../modules/time-sale/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TIME_SALE_MODULE) as unknown as TimeSaleModuleService
  const sales = await svc.listActiveSales(new Date().toISOString())

  const time_sales = (sales ?? []).map((s: any) => ({
    id: s.id,
    product_id: s.product_id,
    title: s.title,
    discount_type: s.discount_type,
    discount_value: s.discount_value,
    original_price: s.original_price ?? null,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
  }))

  res.json({ time_sales })
}

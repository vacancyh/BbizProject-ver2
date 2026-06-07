/**
 * 타임세일 단건 조회/종료 Admin API
 *  - GET    /admin/time-sales/:id     단건 조회(없으면 404)
 *  - DELETE /admin/time-sales/:id     세일 강제 종료(status="ended")
 * 권한 검사·감사 기록은 src/api/middlewares.ts(time-sales 메뉴) 가 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TIME_SALE_MODULE } from "../../../../modules/time-sale"
import TimeSaleModuleService from "../../../../modules/time-sale/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TIME_SALE_MODULE) as unknown as TimeSaleModuleService
  const found = await svc.getSale(req.params.id)
  if (!found) {
    res.status(404).json({ message: "존재하지 않는 타임세일입니다." })
    return
  }
  res.json({ time_sale: found })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TIME_SALE_MODULE) as unknown as TimeSaleModuleService
  const found = await svc.getSale(req.params.id)
  if (!found) {
    res.status(404).json({ message: "존재하지 않는 타임세일입니다." })
    return
  }
  const ended = await svc.endSale(req.params.id)
  res.json({ time_sale: ended, ended: true })
}

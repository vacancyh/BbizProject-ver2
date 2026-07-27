/**
 * 휴면계정 조회 (개인정보보호법 유효기간 관리)
 *  - GET /admin/customers/dormancy?dormantDays=365&warnDays=335
 *    → { dormant: [{id,email,last_active_at}], atRisk: [...] , counts }
 * 휴면(1년 미접속) 및 임박(휴면 30일 전) 고객을 운영자가 확인·조치.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CUSTOMER_DORMANCY_MODULE } from "../../../../modules/customer-dormancy"
import type CustomerDormancyModuleService from "../../../../modules/customer-dormancy/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    CUSTOMER_DORMANCY_MODULE
  ) as unknown as CustomerDormancyModuleService
  const dormantDays = Number((req.query as any)?.dormantDays) || 365
  const warnDays = Number((req.query as any)?.warnDays) || 335

  const { dormant, atRisk } = await svc.classify(Date.now(), dormantDays, warnDays)

  // 고객 이메일 매핑(코어 customer 읽기만)
  const ids = [...dormant, ...atRisk]
  const emailMap = new Map<string, string>()
  if (ids.length) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "customer",
        fields: ["id", "email"],
        filters: { id: ids } as Record<string, unknown>,
      })
      for (const c of data ?? []) emailMap.set((c as any).id, (c as any).email)
    } catch {
      // ignore — id 만 반환
    }
  }
  const shape = (id: string) => ({ id, email: emailMap.get(id) ?? null })
  res.json({
    counts: { dormant: dormant.length, at_risk: atRisk.length },
    dormant: dormant.map(shape),
    at_risk: atRisk.map(shape),
    policy: { dormantDays, warnDays },
  })
}

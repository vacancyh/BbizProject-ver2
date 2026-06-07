/**
 * 시스템 정책 목록 Admin API
 *
 *  - GET /admin/policy/policies?category=
 *      기본 정책을 시드(idempotent)한 뒤 정책 목록을 반환.
 *
 * 정책 관리 화면(apps/admin /policies)의 소스.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POLICY_MODULE } from "../../../../modules/policy"
import PolicyModuleService from "../../../../modules/policy/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  await policy.seedDefaults()
  const q = req.query as Record<string, string | undefined>
  const policies = await policy.list(q.category)
  res.json({ policies, count: policies.length })
}

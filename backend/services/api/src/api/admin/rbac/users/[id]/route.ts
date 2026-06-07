/**
 * 관리자 등급 부여 Admin API
 *
 *  - POST /admin/rbac/users/:id
 *      관리자(:id)에게 등급을 부여(1인 1등급 upsert).
 *      body = { role_key: "super"|"operation"|"cs"|"marketer" }
 *
 * 권한 검사(이 경로의 write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RBAC_MODULE } from "../../../../../modules/rbac"
import RbacModuleService from "../../../../../modules/rbac/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  const userId = req.params.id
  const body = (req.body ?? {}) as { role_key?: string }
  if (!body.role_key) {
    res.status(400).json({ message: "role_key 가 필요합니다." })
    return
  }
  const assigned = await rbac.assignRole(userId, body.role_key)
  res.json({ user_role: assigned })
}

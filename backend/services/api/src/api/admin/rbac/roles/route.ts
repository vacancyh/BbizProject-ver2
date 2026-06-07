/**
 * RBAC 등급·권한 매트릭스 Admin API
 *
 *  - GET /admin/rbac/roles
 *      기본 등급/권한을 시드(idempotent)한 뒤 등급 + 권한 매트릭스 + 메뉴 목록을 반환.
 *
 * 권한 관리 화면(apps/admin /permissions)의 매트릭스 소스.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RBAC_MODULE } from "../../../../modules/rbac"
import RbacModuleService from "../../../../modules/rbac/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  // 최초 접근 시 기본 등급/권한 시드(idempotent)
  await rbac.seedDefaults()
  const matrix = await rbac.getMatrix()
  res.json(matrix)
}

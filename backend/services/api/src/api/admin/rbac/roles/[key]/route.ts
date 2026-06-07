/**
 * RBAC 등급 권한 수정 Admin API
 *
 *  - POST /admin/rbac/roles/:key  (기존 — 하위호환 유지)
 *  - PUT  /admin/rbac/roles/:key  (spec API2 — t010 §6)
 *      등급(:key)의 특정 메뉴 권한을 수정.
 *      body = { menu_id, can_read?, can_create?, can_update?, can_delete? }
 *      super 등급은 변경 금지(service 에서 거부).
 *
 * 권한 검사(이 경로의 write)는 src/api/middlewares.ts 가 permissions 메뉴 기준으로 수행한다.
 * C1: 비SUPER 관리자가 이 경로에 write 하면 middlewares rbacGuard 가 403 반환.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RBAC_MODULE } from "../../../../../modules/rbac"
import RbacModuleService from "../../../../../modules/rbac/service"

async function handleRolePermissionUpdate(req: MedusaRequest, res: MedusaResponse) {
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  const roleKey = req.params.key
  const body = (req.body ?? {}) as {
    menu_id?: string
    can_read?: boolean
    can_create?: boolean
    can_update?: boolean
    can_delete?: boolean
  }
  if (!body.menu_id) {
    res.status(400).json({ message: "menu_id 가 필요합니다." })
    return
  }
  try {
    const { menu_id, ...perms } = body
    const updated = await rbac.setRolePermission(roleKey, menu_id, perms)
    res.json({ permission: updated })
  } catch (e) {
    res.status(400).json({ message: (e as Error).message })
  }
}

/** POST — 기존 경로 하위호환 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return handleRolePermissionUpdate(req, res)
}

/** PUT — spec t010 §6 API2 정합 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  return handleRolePermissionUpdate(req, res)
}

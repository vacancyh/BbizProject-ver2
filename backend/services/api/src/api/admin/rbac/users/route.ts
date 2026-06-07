/**
 * 관리자 계정 + 등급 매핑 Admin API
 *
 *  - GET /admin/rbac/users
 *      Medusa user(관리자) 목록 + 각 계정의 RBAC 등급을 반환.
 *      등급 미지정 계정은 role_key=null(부트스트랩상 전체 권한).
 *
 * Medusa core(user)는 query.graph 로 읽기만 한다(수정 금지).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RBAC_MODULE } from "../../../../modules/rbac"
import RbacModuleService from "../../../../modules/rbac/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  let users: any[] = []
  try {
    const { data } = await query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name"],
    })
    users = Array.isArray(data) ? data : []
  } catch {
    users = []
  }

  const rows = await Promise.all(
    users.map(async (u) => {
      const roleKey = await rbac.getUserRole(u.id)
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim()
      return {
        id: u.id,
        email: u.email,
        name: name || null,
        role_key: roleKey,
      }
    })
  )

  res.json({ users: rows, count: rows.length })
}

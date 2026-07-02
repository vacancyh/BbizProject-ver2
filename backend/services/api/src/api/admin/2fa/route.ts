/**
 * 관리자 2FA 상태 조회 / 해제
 *  - GET    /admin/2fa  → { enabled }
 *  - DELETE /admin/2fa  → 2FA 비활성/삭제
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_2FA_MODULE } from "../../../modules/admin-2fa"
import type Admin2faModuleService from "../../../modules/admin-2fa/service"

function userId(req: MedusaRequest): string | null {
  return (req as any).auth_context?.actor_id ?? null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const uid = userId(req)
  if (!uid) {
    res.status(401).json({ message: "인증이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(ADMIN_2FA_MODULE) as unknown as Admin2faModuleService
  const row = await svc.getByUser(uid)
  const backup_codes_remaining = row?.enabled ? await svc.countBackupCodes(uid) : 0
  res.json({
    enabled: !!row?.enabled,
    enrolled: !!row,
    backup_codes_remaining,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const uid = userId(req)
  if (!uid) {
    res.status(401).json({ message: "인증이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(ADMIN_2FA_MODULE) as unknown as Admin2faModuleService
  const row = await svc.getByUser(uid)
  if (row) await svc.deleteAdminTotps(row.id)
  // 검증 세션 + 백업 코드도 정리(잔여 데이터 방지).
  await svc.revokeSessions(uid)
  await svc.revokeBackupCodes(uid)
  res.json({ enabled: false })
}

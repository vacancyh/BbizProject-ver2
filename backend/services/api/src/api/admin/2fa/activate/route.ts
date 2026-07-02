/**
 * 관리자 2FA 활성화 — 등록 코드 검증 후 enabled=true + 백업 코드 발급.
 *  - POST /admin/2fa/activate { code } → { enabled: true, backup_codes: string[] }
 *    (코드 불일치 400) — 백업 코드 원문은 이 응답에서만 노출.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_2FA_MODULE } from "../../../../modules/admin-2fa"
import type Admin2faModuleService from "../../../../modules/admin-2fa/service"
import { verifyTotp } from "../../../_utils/totp"
import { decryptSecret } from "../../../_utils/secret-crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const uid = (req as any).auth_context?.actor_id as string | undefined
  if (!uid) {
    res.status(401).json({ message: "인증이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(
    ADMIN_2FA_MODULE
  ) as unknown as Admin2faModuleService
  const code = String((req.body as any)?.code ?? "")
  const row = await svc.getByUser(uid)
  if (!row) {
    res.status(400).json({ message: "먼저 2FA 등록(setup)을 진행해 주세요." })
    return
  }
  if (!verifyTotp(decryptSecret(row.secret), code)) {
    res.status(400).json({ message: "인증 코드가 올바르지 않습니다." })
    return
  }
  await svc.updateAdminTotps([{ id: row.id, enabled: true }])
  // 백업(복구) 코드 발급 — 원문은 이 응답에서만 노출.
  const backup_codes = await svc.generateBackupCodes(uid)
  // 방금 활성화한 관리자가 즉시 잠기지 않도록 현재 토큰을 검증됨으로 표기.
  const h = req.headers.authorization ?? ""
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null
  if (tok) await svc.markTokenVerified(uid, tok)
  res.json({ enabled: true, backup_codes })
}

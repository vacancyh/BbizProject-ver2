/**
 * 관리자 2FA 백업(복구) 코드 재발급.
 *  - POST /admin/2fa/backup-codes { code } → { backup_codes: string[] }
 *    현재 TOTP 코드 확인 후 재발급(기존 코드 전량 폐기). 원문은 이 응답에서만 노출.
 *
 * 재발급에 TOTP 코드를 요구하는 이유: 탈취된 세션이 인증기 없이 코드를 몰래 돌리지 못하게 함.
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
  const row = await svc.getByUser(uid)
  if (!row || !row.enabled) {
    res.status(400).json({ message: "2FA가 활성화되어 있지 않습니다." })
    return
  }
  const code = String((req.body as any)?.code ?? "")
  if (!verifyTotp(decryptSecret(row.secret), code)) {
    res.status(400).json({ message: "인증 코드가 올바르지 않습니다." })
    return
  }
  const backup_codes = await svc.generateBackupCodes(uid)
  res.json({ backup_codes })
}

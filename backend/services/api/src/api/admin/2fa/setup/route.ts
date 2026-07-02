/**
 * 관리자 2FA 등록 시작 — 시크릿 발급(아직 미활성).
 *  - POST /admin/2fa/setup → { secret, otpauth_uri, qr_svg }
 * 인증앱(Google Authenticator 등)에 QR 스캔 또는 수동 키 입력 후 /admin/2fa/activate 로 활성화.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ADMIN_2FA_MODULE } from "../../../../modules/admin-2fa"
import type Admin2faModuleService from "../../../../modules/admin-2fa/service"
import { generateSecret, otpauthUri } from "../../../_utils/totp"
import { encryptSecret } from "../../../_utils/secret-crypto"
import { qrSvg } from "../../../_utils/qr"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const uid = (req as any).auth_context?.actor_id as string | undefined
  if (!uid) {
    res.status(401).json({ message: "인증이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(
    ADMIN_2FA_MODULE
  ) as unknown as Admin2faModuleService

  // 관리자 이메일(otpauth 라벨용)
  let email = uid
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "user",
      fields: ["email"],
      filters: { id: uid },
    })
    email = data?.[0]?.email ?? uid
  } catch {
    // ignore
  }

  const secret = generateSecret()
  // 시크릿은 암호화(AES-256-GCM)해 저장. 원문은 응답으로만 노출(등록용).
  const stored = encryptSecret(secret)
  const existing = await svc.getByUser(uid)
  if (existing) {
    await svc.updateAdminTotps([{ id: existing.id, secret: stored, enabled: false }])
  } else {
    await svc.createAdminTotps([{ user_id: uid, secret: stored, enabled: false }])
  }

  const uri = otpauthUri(secret, email)
  res.json({ secret, otpauth_uri: uri, qr_svg: qrSvg(uri, { scale: 5, border: 3 }) })
}

/**
 * 관리자 2FA 코드 검증 — 로그인 2단계(패스워드 통과 후 코드 입력) 검증.
 *  - POST /admin/2fa/verify { code } → { verified: true } (불일치 401)
 * 프런트: 로그인(비밀번호) 성공 후 2FA enabled 이면 이 엔드포인트로 코드 검증하고 통과 처리.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_2FA_MODULE } from "../../../../modules/admin-2fa"
import type Admin2faModuleService from "../../../../modules/admin-2fa/service"
import { verifyTotp } from "../../../_utils/totp"
import { decryptSecret } from "../../../_utils/secret-crypto"

/** 요청 헤더에서 Bearer 토큰 원문 추출(세션 검증 표기용). */
function bearer(req: MedusaRequest): string | null {
  const h = req.headers.authorization ?? ""
  return h.startsWith("Bearer ") ? h.slice(7) : null
}

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
  if (!row || !row.enabled) {
    // 2FA 미설정: 통과(요구 대상 아님)
    res.json({ verified: true, required: false })
    return
  }
  // TOTP 코드 우선 검증, 실패 시 백업(복구) 코드 1회 소진 검증.
  let viaBackup = false
  if (!verifyTotp(decryptSecret(row.secret), code)) {
    viaBackup = await svc.consumeBackupCode(uid, code)
    if (!viaBackup) {
      // 잘못된 코드는 검증 실패(400) — 인증(401)이 아님.
      // 401 로 응답하면 관리자 클라이언트가 세션 만료로 오인해 강제 로그아웃됨.
      res.status(400).json({ message: "인증 코드가 올바르지 않습니다." })
      return
    }
  }
  // 서버측 게이팅: 현재 토큰을 2FA 검증됨으로 표기(이후 /admin/* 접근 허용).
  const tok = bearer(req)
  if (tok) await svc.markTokenVerified(uid, tok)
  res.json({ verified: true, required: true, via_backup: viaBackup })
}

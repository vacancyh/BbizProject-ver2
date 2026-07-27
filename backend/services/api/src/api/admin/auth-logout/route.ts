/**
 * 관리자 로그아웃 — 현재 토큰을 서버측 denylist 에 올려 무효화(재사용 차단).
 *  - POST /admin/auth-logout → { ok: true }
 * 클라이언트는 이후 로컬 토큰을 삭제하고 /login 으로 이동한다.
 * (경로명은 코어 /admin/auth 와 충돌 피하려 auth-logout 사용)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { denylistToken } from "../../_utils/token-denylist"

// 토큰 잔여수명을 알 수 없으므로 JWT 최대 수명(기본 1d)만큼 denylist 유지.
const TTL_SEC = Number(process.env.JWT_DENYLIST_TTL_SEC) || 24 * 60 * 60

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const h = req.headers.authorization ?? ""
  const tok = h.startsWith("Bearer ") ? h.slice(7) : null
  if (tok) {
    try {
      await denylistToken(req.scope, tok, TTL_SEC)
    } catch {
      // ignore — 클라이언트 토큰 삭제로도 사실상 로그아웃됨
    }
  }
  res.json({ ok: true })
}

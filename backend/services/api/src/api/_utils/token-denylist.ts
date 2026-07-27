/**
 * 토큰 denylist — 로그아웃 시 해당 토큰을 서버측에서 무효화(만료 전까지 재사용 차단).
 * Medusa JWT 는 stateless 이므로, 로그아웃한 토큰을 denylist 에 올려 미들웨어가 거부한다.
 *
 * 저장소: Medusa 캐시 서비스(Modules.CACHE, 운영 Redis 구성 시 다중 인스턴스 공유)
 *         → 미가용 시 인메모리 폴백. TTL 로 토큰 만료 시 자동 정리.
 */
import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import crypto from "crypto"

const memory = new Map<string, number>() // tokenHash → expireAt(ms)
const KEY = (h: string) => `denylist:tok:${h}`

function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}
function resolveCache(container: MedusaContainer): any | null {
  try {
    const c = container.resolve(Modules.CACHE)
    if (c && typeof c.get === "function" && typeof c.set === "function") return c
  } catch {
    /* 폴백 */
  }
  return null
}

/** 토큰을 ttlSec 동안 denylist 에 등록(로그아웃). */
export async function denylistToken(
  container: MedusaContainer,
  token: string,
  ttlSec: number
): Promise<void> {
  const h = hash(token)
  const cache = resolveCache(container)
  if (cache) {
    try {
      await cache.set(KEY(h), "1", ttlSec)
      return
    } catch {
      /* 폴백 */
    }
  }
  memory.set(h, Date.now() + ttlSec * 1000)
}

/** 토큰이 denylist(로그아웃) 되었는지. 오류 시 false(fail-open). */
export async function isTokenDenylisted(
  container: MedusaContainer,
  token: string
): Promise<boolean> {
  const h = hash(token)
  const cache = resolveCache(container)
  if (cache) {
    try {
      return !!(await cache.get(KEY(h)))
    } catch {
      /* 폴백 */
    }
  }
  const exp = memory.get(h)
  if (!exp) return false
  if (exp < Date.now()) {
    memory.delete(h)
    return false
  }
  return true
}

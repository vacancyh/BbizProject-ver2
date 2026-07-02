/**
 * 고정창(fixed-window) 카운터 rate limit 헬퍼 — 다중 인스턴스 레디.
 *
 * 저장소 우선순위:
 *  1) Medusa 캐시 서비스(Modules.CACHE) — 운영에서 `@medusajs/cache-redis` 구성 시
 *     자동으로 Redis 공유 저장(코드 변경 없이 다중 인스턴스 rate limit 성립).
 *  2) 캐시 미가용/오류 시 인메모리 Map 폴백(단일 인스턴스 동작 = 기존과 동일).
 *
 * 모든 경로는 fail-open(오류 시 통과) — rate limit 저장소 장애가 서비스 가용성을 막지 않도록.
 * 값 형식: { count, resetAt(ms) }.
 */
import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

type Bucket = { count: number; resetAt: number }

// 인메모리 폴백(프로세스 로컬). 키스페이스별로 공유되는 단일 맵.
const memory = new Map<string, Bucket>()

function memIncr(key: string, windowMs: number, now: number): number {
  const b = memory.get(key)
  if (!b || b.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs })
    return 1
  }
  b.count++
  return b.count
}

function resolveCache(container: MedusaContainer): any | null {
  try {
    const c = container.resolve(Modules.CACHE)
    if (c && typeof c.get === "function" && typeof c.set === "function") return c
  } catch {
    // 캐시 모듈 미등록 → 폴백
  }
  return null
}

/**
 * 카운터 1 증가 후 현재 값 반환(창 만료 시 리셋). 오류 시 0(=제한 안 함, fail-open).
 */
export async function rlIncr(
  container: MedusaContainer,
  key: string,
  windowMs: number,
  now: number = Date.now()
): Promise<number> {
  const cache = resolveCache(container)
  if (!cache) return memIncr(key, windowMs, now)
  try {
    const cur = (await cache.get(key)) as Bucket | null | undefined
    if (!cur || cur.resetAt < now) {
      await cache.set(key, { count: 1, resetAt: now + windowMs }, Math.ceil(windowMs / 1000))
      return 1
    }
    const next: Bucket = { count: cur.count + 1, resetAt: cur.resetAt }
    await cache.set(key, next, Math.max(1, Math.ceil((cur.resetAt - now) / 1000)))
    return next.count
  } catch {
    // 캐시 오류 → 폴백(가용성 우선)
    return memIncr(key, windowMs, now)
  }
}

/** 현재 카운터 값 조회(만료면 0). 오류 시 0(fail-open). */
export async function rlGet(
  container: MedusaContainer,
  key: string,
  now: number = Date.now()
): Promise<number> {
  const cache = resolveCache(container)
  if (!cache) {
    const b = memory.get(key)
    return b && b.resetAt >= now ? b.count : 0
  }
  try {
    const cur = (await cache.get(key)) as Bucket | null | undefined
    return cur && cur.resetAt >= now ? cur.count : 0
  } catch {
    const b = memory.get(key)
    return b && b.resetAt >= now ? b.count : 0
  }
}

/** 카운터 리셋(성공 시). */
export async function rlReset(container: MedusaContainer, key: string): Promise<void> {
  memory.delete(key)
  const cache = resolveCache(container)
  if (!cache) return
  try {
    await cache.invalidate(key)
  } catch {
    // ignore
  }
}

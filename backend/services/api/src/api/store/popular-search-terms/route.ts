/**
 * 인기 검색어 Store API
 *  - GET  /store/popular-search-terms?limit=10 → { terms: string[] } (금칙어 제외, count DESC)
 *      최소 누적 검색 2회 이상만 노출(1회성/오타 유입 방지).
 *  - POST /store/popular-search-terms { term }  → 검색어 집계 기록(정규화 후 저장)
 *      IP당 rate limit(1분 30건) — 특정 검색어 조작·집계 폭주 방지.
 *
 * 무비용: 이미 수집 중인 검색어 집계를 스토어프론트 검색 제안에 노출.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../modules/product-curation"
import type ProductCurationModuleService from "../../../modules/product-curation/service"
import { rlIncr } from "../../_utils/rate-limit"
import { clientIp } from "../../_utils/client-ip"

/** 인기 검색어로 노출할 최소 누적 검색 횟수. */
const MIN_COUNT = 2

// ─── POST rate limit ────────────────────────────────────────────────────────
// 캐시 서비스(운영: Redis) 기반 → 다중 인스턴스 공유. 미가용 시 인메모리 폴백.
const RL_WINDOW_MS = 60_000
const RL_MAX = 30
// IP 산출은 공통 유틸로 일원화 — XFF 위조로 버킷을 갈아치우는 우회를 막는다(2026-08-04).

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const raw = Number((req.query as any)?.limit)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20) : 10
  try {
    const items = await svc.getPopularTerms(limit, MIN_COUNT)
    res.json({ terms: items.map((t: any) => t.term) })
  } catch {
    res.json({ terms: [] })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // rate limit 초과 시에도 검색 UX 를 막지 않도록 202(조용히 무시).
  const hits = await rlIncr(req.scope, `psrl:${clientIp(req)}`, RL_WINDOW_MS)
  if (hits > RL_MAX) {
    res.status(202).json({ recorded: false, throttled: true })
    return
  }
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const term = String((req.body as any)?.term ?? "").trim()
  if (!term || term.length > 50) {
    // 조용히 무시(검색 UX 방해 금지) — 기록만 실패 처리.
    res.status(202).json({ recorded: false })
    return
  }
  try {
    // 금칙어면 집계 제외
    const banned = await svc.checkBannedWord(term, "search")
    if (banned) {
      res.status(202).json({ recorded: false })
      return
    }
    const rec = await svc.recordSearch(term)
    res.status(202).json({ recorded: !!rec })
  } catch {
    res.status(202).json({ recorded: false })
  }
}

// 인기 검색어 데이터 계층.
//   - GET  /store/popular-search-terms → 실집계 인기 검색어(금칙어 제외)
//   - POST /store/popular-search-terms { term } → 검색어 기록(fire-and-forget)
import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export async function getPopularSearchTerms(limit = 8): Promise<string[]> {
  const next = { ...(await getCacheOptions("popular-search-terms")), revalidate: 60 }
  try {
    const res = await sdk.client.fetch<{ terms: string[] }>(
      `/store/popular-search-terms?limit=${limit}`,
      { method: "GET", next }
    )
    return Array.isArray(res?.terms) ? res.terms : []
  } catch {
    return []
  }
}

/** 검색어 집계 기록. 실패해도 검색 UX 를 방해하지 않도록 조용히 무시. */
export async function recordSearchTerm(term: string): Promise<void> {
  const t = (term ?? "").trim()
  if (!t) return
  try {
    await sdk.client.fetch(`/store/popular-search-terms`, {
      method: "POST",
      body: { term: t },
    })
  } catch {
    // ignore
  }
}

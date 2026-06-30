// 배너/팝업 데이터 계층 — 백엔드 cms 모듈(/store/banners) 연동.
//   - GET /store/banners?kind=hero|popup
// 오류 시 빈 배열 폴백(홈 정적 hero 로 자연 대체).

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Banner = {
  id: string
  kind: "hero" | "popup"
  title: string
  image_url: string
  link_url: string | null
}

export async function listBanners(
  kind: "hero" | "popup"
): Promise<Banner[]> {
  const next = { ...(await getCacheOptions("banners")) }
  try {
    const res = await sdk.client.fetch<{ banners: Banner[] }>(
      `/store/banners?kind=${kind}`,
      { method: "GET", next, cache: "force-cache" }
    )
    return res?.banners ?? []
  } catch {
    return []
  }
}

import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { listProducts } from "@lib/data/products"

/**
 * sitemap.xml (2026-07-28 신규)
 *
 * 정적 주요 경로 + 게시 상품 상세를 포함한다.
 * 백엔드 조회가 실패해도(빌드 시 백엔드 미가동 등) 정적 경로만으로 정상 생성되도록 방어한다.
 */
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "kr"

const STATIC_PATHS = [
  "",
  "/store",
  "/customer-service",
  "/order/lookup",
  "/content/terms-of-use",
  "/content/privacy-policy",
]

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseURL()
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${base}/${DEFAULT_REGION}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.7,
  }))

  try {
    const { response } = await listProducts({
      countryCode: DEFAULT_REGION,
      queryParams: { limit: 200, fields: "handle,updated_at" },
    })
    for (const product of response.products) {
      if (!product.handle) continue
      entries.push({
        url: `${base}/${DEFAULT_REGION}/products/${product.handle}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
  } catch {
    // 백엔드 미가동/오류 — 정적 경로만으로 sitemap 을 생성한다(빌드 실패 방지)
  }

  return entries
}

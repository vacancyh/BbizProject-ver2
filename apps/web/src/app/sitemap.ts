import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { listProducts } from "@lib/data/products"
import { UI_LOCALES, type UiLocale } from "@lib/i18n/messages"
import { withLocalePrefix } from "@lib/i18n/routing"
import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"

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

/** UI 언어 → hreflang 값(layout 의 것과 맞춰 둔다). */
const HREFLANG: Record<UiLocale, string> = { ko: "ko-KR", en: "en" }
const LOCALES = Object.keys(UI_LOCALES) as UiLocale[]

/**
 * 한 경로를 **언어 수만큼** sitemap 항목으로 펼친다.
 *
 * 언어가 주소에 담기게 됐으므로(2026-08-12) 한국어 주소만 올리면 영어판은
 * 검색엔진이 존재조차 모른다. 각 항목에 서로를 alternates 로 걸어 준다.
 */
function forEachLocale(
  path: string,
  lastModified: Date,
  changeFrequency: "daily" | "weekly",
  priority: number
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[HREFLANG[l]] = `${base()}${withLocalePrefix(l, path)}`

  return LOCALES.map((l) => ({
    url: `${base()}${withLocalePrefix(l, path)}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }))
}

/** getBaseURL() 을 매번 부르지 않도록 한 번만 계산 */
let _base: string | null = null
function base(): string {
  if (_base === null) _base = getBaseURL()
  return _base
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((p) =>
    forEachLocale(
      `/${DEFAULT_REGION}${p}`,
      now,
      p === "" ? "daily" : "weekly",
      p === "" ? 1 : 0.7
    )
  )

  try {
    const { response } = await listProducts({
      countryCode: DEFAULT_REGION,
      queryParams: { limit: 200, fields: "handle,updated_at" },
    })
    for (const product of response.products) {
      if (!product.handle) continue
      entries.push(
        ...forEachLocale(
          `/${DEFAULT_REGION}/products/${product.handle}`,
          product.updated_at ? new Date(product.updated_at) : now,
          "weekly",
          0.8
        )
      )
    }
  } catch {
    // 백엔드 미가동/오류 — 정적 경로만으로 sitemap 을 생성한다(빌드 실패 방지)
  }

  // 카테고리·컬렉션이 빠져 있었다(2026-08-12). 상품 상세만 올려 두면
  // 검색엔진이 목록 페이지를 스스로 찾아야 하고, 카테고리로 들어오는 유입을 놓친다.
  // 조회 실패는 개별로 삼킨다 — 하나가 실패해도 나머지 sitemap 은 나가야 한다.
  try {
    for (const c of (await listCategories()) ?? []) {
      if (!c.handle) continue
      entries.push(
        ...forEachLocale(`/${DEFAULT_REGION}/categories/${c.handle}`, now, "weekly", 0.6)
      )
    }
  } catch {
    // 카테고리 조회 실패 — 나머지 항목으로 생성
  }

  try {
    const { collections } = await listCollections({ fields: "handle" })
    for (const c of collections ?? []) {
      if (!c.handle) continue
      entries.push(
        ...forEachLocale(`/${DEFAULT_REGION}/collections/${c.handle}`, now, "weekly", 0.6)
      )
    }
  } catch {
    // 컬렉션 조회 실패 — 나머지 항목으로 생성
  }

  return entries
}

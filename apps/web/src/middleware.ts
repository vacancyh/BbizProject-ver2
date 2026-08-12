import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

import {
  PATHNAME_HEADER,
  UI_LOCALE_HEADER,
  splitLocalePrefix,
  withLocalePrefix,
} from "@lib/i18n/routing"
import { DEFAULT_UI_LOCALE, toUiLocale } from "@lib/i18n/messages"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const json = await response.json()

    const { regions } = json

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>,
  /** 언어 접두사를 뗀 경로. 안 떼면 "en" 을 국가코드로 오인한다. */
  barePathname: string
) {
  let countryCode

  const urlCountryCode = barePathname.split("/")[1]?.toLowerCase()

  // Cloudflare Workers provides country via request.cf.country
  const cloudflareCountryCode = (request as { cf?: { country?: string } }).cf?.country?.toLowerCase()

  // Vercel provides x-vercel-ip-country header
  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    countryCode = urlCountryCode
  } else if (cloudflareCountryCode && regionMap.has(cloudflareCountryCode)) {
    countryCode = cloudflareCountryCode
  } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
    countryCode = vercelCountryCode
  } else if (regionMap.has(DEFAULT_REGION)) {
    countryCode = DEFAULT_REGION
  } else if (regionMap.keys().next().value) {
    countryCode = regionMap.keys().next().value
  }

  return countryCode
}

/**
 * 지역(국가코드) 선택 + **언어 접두사** 처리.
 *
 * ── 언어를 왜 여기서 다루나 (2026-08-12) ────────────────────────────────────
 * 전에는 언어가 쿠키에만 있었다. 검색엔진은 쿠키가 없으니 **영어 페이지를 아예
 * 못 봤다.** 이제 주소가 언어를 정한다:
 *
 *     /kr/store      → 한국어 (기본 언어는 접두사 없음 — 기존 주소가 그대로 산다)
 *     /en/kr/store   → 영어
 *
 * 라우트 트리를 언어별로 복제하지 않기 위해, 여기서 `/en` 을 **떼어내고 rewrite**
 * 한 뒤 언어를 요청 헤더로 넘긴다. 앱은 `getUiLocale()` 에서 그 헤더를 읽는다.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)

  // 언어 접두사를 먼저 떼어낸다 — 안 떼면 "en" 이 국가코드로 오인된다.
  const original = request.nextUrl.pathname
  const { locale, pathname: barePath } = splitLocalePrefix(original)

  /*
   * 접두사는 소문자가 표준형이다. `/EN/kr` 도 동작은 하지만 검색엔진에는
   * `/en/kr` 과 **다른 주소**로 보여 중복 문서가 된다. 한 형태로 모아 준다.
   */
  const firstSeg = original.split("/")[1]
  if (locale !== DEFAULT_UI_LOCALE && firstSeg && firstSeg !== firstSeg.toLowerCase()) {
    const canonical = `${request.nextUrl.origin}${withLocalePrefix(locale, barePath)}${
      request.nextUrl.search || ""
    }`
    return NextResponse.redirect(canonical, 308)
  }

  const countryCode = await getCountryCode(request, regionMap, barePath)

  // if the country code is available, use it, otherwise use the default region
  const country = countryCode || DEFAULT_REGION
  const firstPathSegment = barePath.split("/")[1]?.toLowerCase()
  const urlHasCountry = firstPathSegment === country.toLowerCase()
  const queryString = request.nextUrl.search || ""

  if (urlHasCountry) {
    // 주소에 언어가 이미 담겨 있으므로 그대로 그린다.
    // 접두사를 뗀 경로로 rewrite 하고, 언어는 헤더로 넘긴다.
    const headers = new Headers(request.headers)
    headers.set(UI_LOCALE_HEADER, locale)
    // hreflang·canonical 을 만들려면 **보이는 주소**가 필요하다(rewrite 후에는 알 수 없다)
    headers.set(PATHNAME_HEADER, original)

    const url = request.nextUrl.clone()
    url.pathname = barePath

    const response = NextResponse.rewrite(url, { request: { headers } })
    if (!cacheIdCookie) {
      response.cookies.set("_medusa_cache_id", cacheId, { maxAge: 60 * 60 * 24 })
    }
    return response
  }

  /*
   * 국가코드가 없는 주소 → 붙여서 보낸다.
   *
   * 이때만 **쿠키에 기억된 언어**를 반영한다. 예: 영어로 보던 사람이 `/` 로 들어오면
   * `/en/kr` 로 보낸다. 접두사가 이미 있는 주소는 건드리지 않는다 —
   * 주소가 이긴다는 규칙이 흔들리면 링크 공유가 다시 깨진다.
   */
  const cookieLocale = toUiLocale(request.cookies.get("_medusa_locale")?.value)
  const target = locale !== DEFAULT_UI_LOCALE ? locale : cookieLocale

  const redirectPath = barePath === "/" ? "" : barePath
  const withCountry = `/${country}${redirectPath}`
  const redirectUrl = `${request.nextUrl.origin}${withLocalePrefix(target, withCountry)}${queryString}`

  return NextResponse.redirect(redirectUrl, 307)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}

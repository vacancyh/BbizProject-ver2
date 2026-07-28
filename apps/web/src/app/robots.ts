import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

/**
 * robots.txt (2026-07-28 신규)
 *
 * 기존에는 `next-sitemap.js` 설정 파일만 있고 패키지·postbuild 스크립트가 없어
 * robots.txt / sitemap.xml 이 **실제로는 생성되지 않았다**. App Router 네이티브로 대체한다.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getBaseURL()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 개인화/결제/인증 경로는 색인 제외
        disallow: ["/api/", "/*/checkout", "/*/account", "/*/order/", "/*/reset-password"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

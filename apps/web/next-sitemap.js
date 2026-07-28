// [사용 안 함 — 2026-07-28] next-sitemap 패키지와 postbuild 스크립트가 없어
// 이 설정으로는 robots.txt / sitemap.xml 이 실제로 생성되지 않았다.
// App Router 네이티브 구현(src/app/robots.ts, src/app/sitemap.ts)으로 대체됨.
// 참고용으로 남겨두며, next-sitemap 도입 시 다시 사용할 수 있다.
const excludedPaths = ["/checkout", "/account/*"]

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
  generateRobotsTxt: true,
  exclude: excludedPaths + ["/[sitemap]"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: excludedPaths,
      },
    ],
  },
}

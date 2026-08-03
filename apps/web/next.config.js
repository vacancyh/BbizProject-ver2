const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

// 보안 헤더 (전 경로 적용). CSP 는 다음 우편번호·데모 이미지·백엔드 API 를 허용.
// 'unsafe-eval' 은 개발(HMR)에서만 허용, 운영 빌드에선 제거.
const isDev = process.env.NODE_ENV !== "production"

/**
 * connect-src 를 실제 백엔드 오리진으로 한정한다 (2026-08-03 점검).
 *
 * 이전 값: "connect-src 'self' http://localhost:9000 https: ws: wss:"
 *  - `https:` 는 **모든 HTTPS 호스트**를 허용하는 와일드카드다. XSS 가 한 번 성공하면
 *    공격자 서버로 데이터를 그대로 실어 보낼 수 있어 connect-src 방어가 사실상 무의미했다.
 *  - `http://localhost:9000` 은 개발 값이 그대로 박혀 있었다.
 *
 * 개발에서는 HMR·로컬 도구를 위해 기존처럼 넉넉히 두고, **운영 빌드에서만** 좁힌다.
 * ⚠️ 운영에서 외부 서비스(분석·결제 SDK 등)를 붙이면 반드시 여기에 오리진을 추가할 것.
 *    누락 시 브라우저가 요청을 차단하며 조용히 기능이 죽는다.
 */
const BACKEND_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!raw) return ""
  try {
    return new URL(raw).origin
  } catch {
    return ""
  }
})()
const CONNECT_SRC = isDev
  ? "connect-src 'self' http://localhost:9000 https: ws: wss:"
  : `connect-src 'self'${BACKEND_ORIGIN ? ` ${BACKEND_ORIGIN}` : ""} wss:`

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.daumcdn.net https://t1.daumcdn.net`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  // 상품 이미지 CDN 이 확정되면 https: 대신 해당 호스트로 좁힐 것(현재는 데모 이미지 호스트가 유동적).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  CONNECT_SRC,
  "frame-src 'self' https://*.daum.net https://postcode.map.daum.net",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: CSP },
]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  reactStrictMode: true,
  // 프레임워크 노출 제거(정보 최소화). 백엔드는 이미 X-Powered-By 를 지우고 있었는데
  // 스토어프론트만 `X-Powered-By: Next.js` 를 그대로 내보내고 있었다(2026-08-03).
  poweredByHeader: false,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // 2026-07-28: lint 에러 21건·타입 에러 0 정리 후 빌드 게이트를 다시 켬.
  // (타입/lint 오류가 조용히 배포되던 리스크 제거 — 남은 건 exhaustive-deps 경고 4건뿐)
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    /**
     * 이미지 최적화 (2026-08-03 활성화)
     *
     * 이전에는 `unoptimized: true` 라 **원본 파일을 그대로 내려보냈다.**
     * 쇼핑몰 페이지 무게의 대부분이 상품 이미지이므로 영향이 크다:
     *   - 모바일 로딩이 느려 이탈률이 오른다(구매전환에 직결)
     *   - 트래픽 비용이 몇 배로 나간다
     *   - LCP 저하 → 검색 노출 불이익
     *
     * 이제 Next 가 WebP/AVIF 변환 + 화면 크기별 리사이즈를 처리한다.
     * ⚠️ 운영 서버에서 sharp 네이티브 바이너리가 설치돼야 한다
     *    (pnpm 이 build script 를 건너뛰면 최적화가 실패한다 — 배포 시 확인할 것).
     */
    formats: ["image/avif", "image/webp"],
    // 상품 이미지는 목록(작게)·상세(크게) 두 용도가 대부분이라 과한 단계는 두지 않는다.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 256, 384],
    // 원본이 바뀌지 않는 상품 이미지 특성상 길게 캐시한다(31일).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      // 데모용 플레이스홀더 이미지 (운영 전환 시 실제 상품 이미지/CDN 으로 교체)
      //
      // ⚠️ 2026-08-03: 이미지 최적화를 켜면 **여기 없는 호스트는 500 을 낸다.**
      //    실제로 images.pexels.com 이 누락돼 상품 상세 페이지가 통째로 죽었다.
      //    상품/배너 이미지를 새 호스트에 올리면 반드시 여기에 추가할 것.
      //    (등록 누락은 preflight-check.ts 가 사전에 잡는다)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig

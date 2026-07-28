import type { NextConfig } from "next";

// 관리자(백오피스) 보안 헤더 — 프레이밍 전면 차단(DENY) 등 스토어보다 엄격.
// 'unsafe-eval' 은 개발(HMR)에서만 허용, 운영 빌드에선 제거.
const isDev = process.env.NODE_ENV !== "production"
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "connect-src 'self' http://localhost:9000 https: ws: wss:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  reactStrictMode: true,
  // 2026-07-28: ESLint 설정(.eslintrc.json)을 추가하고 에러 28건을 정리해 게이트를 켬.
  // prototype 정적 산출물은 .eslintrc.json 의 ignorePatterns 로 제외한다.
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;

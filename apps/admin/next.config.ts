import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // prototype 정적 산출물은 빌드 대상에서 제외 (디자인 사양 전용, 읽기 전용)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

/**
 * 고객 IP 를 백엔드에 전달 (2026-08-04 신설)
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────
 * 이 앱의 데이터 계층은 전부 Next.js 서버 액션(`"use server"`)이다.
 * 로그인·리뷰·문의·주문조회 요청이 **고객 브라우저가 아니라 이 서버에서** 백엔드로 나간다.
 * 그래서 백엔드가 보는 요청자는 늘 "스토어프론트 서버 한 대"였고,
 * IP 기준 레이트리밋이 고객별이 아니라 **쇼핑몰 전체 합산**으로 걸렸다.
 *
 * 실측(2026-08-04): 서로 다른 고객 10명이 비밀번호를 틀리자
 * 아무 잘못 없는 11번째 고객까지 429 를 받았다 — 쇼핑몰 전체 5분 로그인 불가.
 *
 * → 이 모듈이 **우리가 확인한 고객 IP** 를 백엔드에 알려준다.
 *   아무나 헤더를 넣어 남의 버킷을 조작하지 못하도록 공유 시크릿을 함께 보낸다.
 *
 * ── 설정 (둘 다 있어야 동작한다) ─────────────────────────────────────
 *   INTERNAL_CLIENT_IP_SECRET          백엔드와 **같은 값**. 서버 전용(NEXT_PUBLIC_ 아님)
 *   STOREFRONT_TRUSTED_PROXY_HOPS      이 앱 앞의 신뢰 프록시 대수
 *       0 (기본)  전달 안 함 — 고객 IP 를 신뢰할 방법이 없다(로컬 개발)
 *       1         LB/CDN 한 대 뒤   ← 가장 흔한 운영 구성
 *       2         CDN + LB 두 단 뒤
 *
 * ⚠️ 홉 수를 실제보다 크게 잡으면 고객이 위조한 값을 그대로 전달하게 된다. 모르면 0.
 * ⚠️ 백엔드에도 같은 시크릿을 넣어야 한다. 한쪽만 설정하면 전달이 무시된다(기존 동작).
 */
import { headers as nextHeaders } from "next/headers"

const IP_HEADER = "x-internal-client-ip"
const TOKEN_HEADER = "x-internal-client-ip-token"

function trustedHops(): number {
  const n = Number(process.env.STOREFRONT_TRUSTED_PROXY_HOPS)
  return Number.isInteger(n) && n > 0 && n < 10 ? n : 0
}

/**
 * 백엔드로 보낼 고객 IP 헤더. 조건이 안 맞으면 undefined(= 전달 안 함).
 *
 * 클라이언트 컴포넌트에서 호출되면 `next/headers` 가 던지므로 조용히 건너뛴다.
 */
export async function clientIpHeaders(): Promise<Record<string, string> | undefined> {
  const secret = process.env.INTERNAL_CLIENT_IP_SECRET
  const hops = trustedHops()
  if (!secret || hops === 0) return undefined

  try {
    const h = await nextHeaders()
    // 프록시는 자기에게 접속한 주소를 **뒤에** 덧붙인다.
    // 따라서 신뢰 프록시가 N대면 진짜 고객은 오른쪽에서 N번째다.
    // 왼쪽 값들은 고객이 위조할 수 있으므로 쓰지 않는다.
    const chain = (h.get("x-forwarded-for") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (chain.length < hops) return undefined

    const ip = chain[chain.length - hops]
    if (!ip || ip.length > 64) return undefined

    return { [IP_HEADER]: ip, [TOKEN_HEADER]: secret }
  } catch {
    // 클라이언트 컴포넌트 등 요청 컨텍스트가 없는 경우 — 전달하지 않는다
    return undefined
  }
}

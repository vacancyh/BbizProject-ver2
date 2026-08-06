/**
 * 요청자 IP 산출 — 레이트리밋 버킷 키의 근거 (2026-08-04 신설)
 *
 * ── 왜 새로 만들었나 ────────────────────────────────────────────────
 * 기존 구현은 `X-Forwarded-For` 의 **맨 앞 값**을 클라이언트 IP 로 썼다.
 * 그런데 이 헤더는 요청자가 직접 붙이는 것이라, 매 요청 다른 값을 넣으면
 * 항상 새 버킷이 잡혀 IP 기준 레이트리밋이 통째로 무력화된다.
 *
 * 실측(2026-08-04, audit4-ratelimit-probe.mjs):
 *   비회원 주문조회(분당 30)  고정 IP 30/40 통과 → 헤더 회전 시 39/40 통과
 *   베스트 상품(분당 60)      헤더 회전 80/80 통과, 차단 0건
 *
 * ── 어떻게 고쳤나 ──────────────────────────────────────────────────
 * XFF 는 각 프록시가 "자기에게 접속한 주소"를 **뒤에 덧붙인다.**
 * 따라서 신뢰할 수 있는 프록시가 N대라면 진짜 클라이언트는 **오른쪽에서 N번째**다.
 *
 *   XFF: "<요청자가 위조한 값들>, <진짜 IP>, <프록시1>"   (신뢰 프록시 2대)
 *                                  ↑ 오른쪽에서 2번째
 *
 * 왼쪽 값은 전부 위조 가능하므로 절대 쓰지 않는다.
 *
 * ── 설정 ───────────────────────────────────────────────────────────
 * `TRUSTED_PROXY_HOPS` = 앱 앞에 있는 **신뢰 가능한** 프록시 대수.
 *
 *   0 (기본)  XFF 를 아예 무시하고 소켓 주소만 쓴다.
 *             로컬 개발·프록시 없는 배포에서 안전한 기본값이다.
 *   1         ALB / CloudFront / Nginx 한 대 뒤 → 가장 흔한 구성
 *   2         CDN + LB 처럼 두 단 뒤
 *
 * ⚠️ 프록시 앞단에서 **클라이언트가 보낸 XFF 를 덮어쓰도록** 설정해야 완전하다.
 *    (Nginx: `proxy_set_header X-Forwarded-For $remote_addr;`)
 *    홉 수만 맞춰도 위조분은 왼쪽에 밀려 무시되지만, 덮어쓰면 더 확실하다.
 *
 * 홉 수를 실제보다 크게 잡으면 위조 값을 읽게 되므로, 모르면 0 으로 둔다.
 */
import crypto from "crypto"
import type { MedusaRequest } from "@medusajs/framework/http"

/**
 * ── 내부 서비스가 대신 알려주는 고객 IP ──────────────────────────────
 *
 * 스토어프론트의 데이터 계층은 전부 Next.js 서버 액션(`"use server"`)이라,
 * 로그인·리뷰·주문조회 요청이 **고객 브라우저가 아니라 스토어프론트 서버에서** 나간다.
 * 그래서 백엔드가 보는 요청자는 항상 스토어프론트 서버 한 대다.
 *
 * 실측(2026-08-04): 서로 다른 고객 10명이 비밀번호를 틀리면
 * IP별 실패 카운터(10회/5분)가 차서 **아무 잘못 없는 11번째 고객도 429** 를 받았다.
 * 쇼핑몰 전체가 5분간 로그인 불가가 된다.
 *
 * 해결: 스토어프론트가 **자기가 확인한 고객 IP** 를 백엔드에 알려준다.
 * 아무나 헤더를 넣어 남의 버킷을 조작하지 못하도록 **공유 시크릿**을 함께 보낸다.
 *   INTERNAL_CLIENT_IP_SECRET  — 스토어프론트와 백엔드가 같은 값을 갖는다
 *
 * 시크릿이 없으면 이 경로는 통째로 비활성이다(기존 동작 유지).
 */
const IP_HEADER = "x-internal-client-ip"
const TOKEN_HEADER = "x-internal-client-ip-token"

/** 길이 노출·타이밍 공격을 피해 비교한다. */
function tokenMatches(given: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(given).digest()
  const b = crypto.createHash("sha256").update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

/** 내부 서비스가 서명과 함께 전달한 고객 IP. 없거나 위조면 null. */
function forwardedByInternalService(req: MedusaRequest): string | null {
  const secret = process.env.INTERNAL_CLIENT_IP_SECRET
  if (!secret) return null

  const token = req.headers[TOKEN_HEADER]
  const ip = req.headers[IP_HEADER]
  if (typeof token !== "string" || typeof ip !== "string") return null

  const trimmed = ip.trim()
  if (!trimmed || trimmed.length > 64) return null // 버킷 키가 되므로 길이를 제한한다
  if (!tokenMatches(token, secret)) return null
  return trimmed
}

/** 앱 앞의 신뢰 프록시 대수. 잘못된 값은 0 으로 떨어뜨린다(안전 쪽). */
function trustedHops(): number {
  const n = Number(process.env.TRUSTED_PROXY_HOPS)
  return Number.isInteger(n) && n > 0 && n < 10 ? n : 0
}

/**
 * 소켓 주소 — 프록시가 없으면 이게 진짜 요청자다.
 *
 * ⚠️ `req.ip` 를 쓰면 안 된다.
 * Medusa 프레임워크가 `app.set("trust proxy", 1)` 을 **무조건** 켜기 때문에
 * (`@medusajs/framework/dist/http/express-loader.js:68`), Express 의 `req.ip` 는
 * X-Forwarded-For 에서 값을 뽑아 온다. 즉 요청자가 위조한 값이 그대로 들어온다.
 * 실측: 이 함수가 `req.ip` 를 먼저 보던 동안에는 헤더 회전으로 39/40 이 통과했다.
 *
 * 소켓 주소는 TCP 연결 상대라 위조할 수 없다.
 */
function socketIp(req: MedusaRequest): string {
  return (
    (req as any).socket?.remoteAddress ||
    (req as any).connection?.remoteAddress ||
    "unknown"
  ).toString()
}

/**
 * 레이트리밋 버킷 키로 쓸 요청자 IP.
 *
 * TRUSTED_PROXY_HOPS 가 0 이면 XFF 를 읽지 않는다 — 위조 불가.
 * 1 이상이면 오른쪽에서 그 번째 값을 쓴다 — 신뢰 구간 안의 값만 본다.
 */
export function clientIp(req: MedusaRequest): string {
  // 스토어프론트 SSR 처럼 내부 서비스가 대신 호출하는 경우가 먼저다.
  // (그렇지 않으면 모든 고객이 스토어프론트 서버 IP 하나를 공유한다)
  const internal = forwardedByInternalService(req)
  if (internal) return internal

  const hops = trustedHops()
  if (hops === 0) return socketIp(req)

  const raw = req.headers["x-forwarded-for"]
  const header = Array.isArray(raw) ? raw.join(",") : (raw as string | undefined) || ""
  const chain = header
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  // 체인이 홉 수보다 짧다 = 프록시를 다 안 거쳤다(직접 접속 등) → 소켓 주소로.
  if (chain.length < hops) return socketIp(req)
  return chain[chain.length - hops] || socketIp(req)
}

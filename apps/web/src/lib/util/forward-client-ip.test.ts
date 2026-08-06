/**
 * 고객 IP 전달 로직 테스트 (2026-08-04)
 *
 * 왜 테스트가 필요한가: 이 로직이 조용히 꺼지면 레이트리밋이 다시
 * "쇼핑몰 전체 합산"으로 돌아간다 — 화면상 아무 증상이 없어서 아무도 모른다.
 * 실측으로 확인된 결함이므로(고객 10명 실패 → 전체 로그인 5분 차단) 회귀를 막아 둔다.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

const mockHeaders = vi.fn()
vi.mock("next/headers", () => ({ headers: () => mockHeaders() }))

/** 매 케이스마다 env 를 갈아끼우고 모듈을 새로 읽는다(모듈 로드시 env 를 읽지 않도록 짜여 있지만 안전하게). */
async function load(env: Record<string, string | undefined>, xff?: string | null) {
  vi.resetModules()
  // `process.env.X = undefined` 는 문자열 "undefined" 가 되어버린다 — 반드시 delete 해야 한다.
  const set = (k: string, v: string | undefined) => {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  set("INTERNAL_CLIENT_IP_SECRET", env.secret)
  set("STOREFRONT_TRUSTED_PROXY_HOPS", env.hops)
  mockHeaders.mockReturnValue({ get: (k: string) => (k === "x-forwarded-for" ? xff ?? null : null) })
  const mod = await import("./forward-client-ip")
  return mod.clientIpHeaders()
}

const SECRET = "shared-secret-value"
const IP_H = "x-internal-client-ip"
const TOKEN_H = "x-internal-client-ip-token"

afterEach(() => {
  delete process.env.INTERNAL_CLIENT_IP_SECRET
  delete process.env.STOREFRONT_TRUSTED_PROXY_HOPS
  vi.clearAllMocks()
})

describe("clientIpHeaders — 켜지는 조건", () => {
  it("시크릿이 없으면 전달하지 않는다", async () => {
    expect(await load({ secret: undefined, hops: "1" }, "1.1.1.1")).toBeUndefined()
  })

  it("홉 수가 0(기본)이면 전달하지 않는다 — 고객 IP 를 신뢰할 방법이 없다", async () => {
    expect(await load({ secret: SECRET, hops: "0" }, "1.1.1.1")).toBeUndefined()
  })

  it("홉 수가 없으면 0 으로 간주한다", async () => {
    expect(await load({ secret: SECRET, hops: undefined }, "1.1.1.1")).toBeUndefined()
  })

  it("둘 다 갖춰지면 IP 와 시크릿을 함께 보낸다", async () => {
    const h = await load({ secret: SECRET, hops: "1" }, "1.1.1.1")
    expect(h).toEqual({ [IP_H]: "1.1.1.1", [TOKEN_H]: SECRET })
  })
})

describe("clientIpHeaders — 어느 값을 고르는가", () => {
  // 프록시는 자기에게 접속한 주소를 뒤에 덧붙인다.
  // 왼쪽 값은 고객이 위조할 수 있으므로 절대 쓰면 안 된다.
  it("홉 1: 맨 오른쪽을 고른다 (왼쪽 위조분 무시)", async () => {
    const h = await load({ secret: SECRET, hops: "1" }, "9.9.9.9, 203.0.113.7")
    expect(h?.[IP_H]).toBe("203.0.113.7")
  })

  it("홉 2: 오른쪽에서 두 번째를 고른다", async () => {
    const h = await load({ secret: SECRET, hops: "2" }, "9.9.9.9, 203.0.113.7, 10.0.0.1")
    expect(h?.[IP_H]).toBe("203.0.113.7")
  })

  it("공백을 제거한다", async () => {
    const h = await load({ secret: SECRET, hops: "1" }, "  203.0.113.7  ")
    expect(h?.[IP_H]).toBe("203.0.113.7")
  })
})

describe("clientIpHeaders — 신뢰할 수 없으면 보내지 않는다", () => {
  it("체인이 홉 수보다 짧으면 전달하지 않는다 (프록시를 다 안 거친 요청)", async () => {
    expect(await load({ secret: SECRET, hops: "2" }, "203.0.113.7")).toBeUndefined()
  })

  it("XFF 가 아예 없으면 전달하지 않는다", async () => {
    expect(await load({ secret: SECRET, hops: "1" }, null)).toBeUndefined()
  })

  it("XFF 가 빈 문자열이면 전달하지 않는다", async () => {
    expect(await load({ secret: SECRET, hops: "1" }, "")).toBeUndefined()
  })

  it("비정상적으로 긴 값은 버린다 — 버킷 키가 되므로", async () => {
    expect(await load({ secret: SECRET, hops: "1" }, "x".repeat(80))).toBeUndefined()
  })

  it("요청 컨텍스트가 없으면(클라이언트 컴포넌트) 조용히 건너뛴다", async () => {
    vi.resetModules()
    process.env.INTERNAL_CLIENT_IP_SECRET = SECRET
    process.env.STOREFRONT_TRUSTED_PROXY_HOPS = "1"
    mockHeaders.mockImplementation(() => {
      throw new Error("headers() was called outside a request scope")
    })
    const mod = await import("./forward-client-ip")
    await expect(mod.clientIpHeaders()).resolves.toBeUndefined()
  })
})

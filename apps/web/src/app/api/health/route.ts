/**
 * 스토어프론트 헬스체크 — 2026-08-03 신설
 *
 *   GET /api/health
 *
 * 왜 필요한가: 스토어프론트에는 헬스체크가 아예 없었다.
 * 외부 감시 도구가 볼 수 있는 지점이 없으면 "사이트가 죽었다"를 고객 전화로 알게 된다.
 *
 * 무엇을 확인하나: 화면이 뜨는 것만으로는 부족하다. 스토어프론트는 백엔드에서
 * 상품·가격을 받아와야 하므로 **백엔드 연결까지** 확인해야 의미가 있다.
 * (백엔드가 죽으면 페이지는 뜨지만 상품이 하나도 안 나온다 — 사실상 장사 불가)
 *
 * 응답
 *   200 { status: "ok",       backend: "up" }
 *   503 { status: "degraded", backend: "down" }
 *
 * 보안: 버전·경로·내부 주소를 노출하지 않는다.
 */
import { NextResponse } from "next/server"

// 항상 실시간으로 확인해야 한다 — 캐시된 "ok" 는 감시에 무의미하다.
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(): Promise<NextResponse> {
  const started = Date.now()
  const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  let backend: "up" | "down" | "unknown" = "unknown"

  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/hc`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      })
      backend = res.ok ? "up" : "down"
    } catch {
      backend = "down"
    }
  }

  const ok = backend !== "down"
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", backend, latency_ms: Date.now() - started },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  )
}

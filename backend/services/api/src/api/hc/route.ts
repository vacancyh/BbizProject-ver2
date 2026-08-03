/**
 * 공개 헬스체크 — 2026-08-03 신설
 *
 *   GET /hc
 *
 * 왜 새로 만들었나:
 *  - Medusa 기본 `/health` 는 "OK" 문자열만 돌려준다. **DB 가 죽어도 OK 가 나간다.**
 *    감시 도구가 초록불만 보고 있으면 장애를 놓친다. 거짓 초록불이 감시 없는 것보다 나쁘다.
 *  - `/admin/ops/health` 는 관리자 인증이 필요하다. UptimeRobot 같은 외부 감시 도구는
 *    인증을 못 하므로 쓸 수 없다.
 *
 * 그래서 **인증 없이 접근 가능하면서 실제 의존성을 확인하는** 엔드포인트가 필요했다.
 *
 * 응답
 *   200 { status: "ok",       db: "up",   ... }   정상
 *   503 { status: "degraded", db: "down", ... }   의존성 장애 → 감시 도구가 알림 발송
 *
 * 보안: 내부 구조를 노출하지 않는다. 버전·경로·연결문자열 같은 건 넣지 않는다.
 *       공개 엔드포인트이므로 남용을 막기 위해 조회 비용이 낮은 쿼리만 쓴다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const started = Date.now()
  let db: "up" | "down" = "down"

  try {
    // 가장 가벼운 실제 DB 조회 1건 — 연결이 살아 있는지만 본다.
    //
    // ⚠️ 타임아웃이 반드시 필요하다. DB 가 죽으면 드라이버가 재연결을 시도하며 **응답 없이 멈춘다**
    //    (실측: DB 컨테이너를 내리자 /hc 가 무응답). 감시 도구 입장에서 "무응답"과 "503" 은
    //    둘 다 장애로 잡히지만, 503 이어야 원인(db down)까지 알 수 있고 헬스체크가
    //    커넥션을 물고 늘어지지 않는다.
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const probe = query.graph({
      entity: "region",
      fields: ["id"],
      pagination: { take: 1 },
    } as any)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("db probe timeout")), 3000)
    )
    await Promise.race([probe, timeout])
    db = "up"
  } catch {
    db = "down"
  }

  const ok = db === "up"
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db,
    // 감시 도구에서 응답 지연 추이를 볼 수 있게 남긴다.
    latency_ms: Date.now() - started,
  })
}

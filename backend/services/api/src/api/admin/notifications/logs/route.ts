/**
 * 알림 발송 이력 Admin API — 2026-08-03 신설
 *
 *   GET /admin/notifications/logs?limit=100&order_id=&customer_id=&status=
 *
 * 용도: 고객이 "알림을 못 받았다"고 할 때의 근거 자료.
 * 언제 / 어떤 문구로 / 성공했는지 / 실패했다면 왜 를 확인한다.
 *
 * status 값
 *   sent    실제 발송됨
 *   logged  발송 업체 미연동 상태에서 기록만 됨(현재 기본)
 *   failed  발송 실패 — error 에 사유
 *   skipped 템플릿이 없거나 비활성이라 건너뜀
 *
 * 권한: RBAC `settings` 메뉴. 수신처(전화번호·이메일)가 포함되므로 권한 없는 등급은 403.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_KR_MODULE } from "../../../../modules/notification-kr"
import type NotificationKrModuleService from "../../../../modules/notification-kr/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    NOTIFICATION_KR_MODULE
  ) as unknown as NotificationKrModuleService

  const q = req.query as Record<string, unknown>
  const filters: Record<string, unknown> = {}
  for (const k of ["order_id", "customer_id", "status", "event"]) {
    if (q[k]) filters[k] = q[k]
  }
  const limit = Number(q.limit) || 100

  const logs = await svc.listRecentLogs(limit, filters)

  // 발송 상태 요약 — 실패가 쌓이고 있는지 한눈에 본다.
  const summary = logs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  res.json({ logs, count: logs.length, summary })
}

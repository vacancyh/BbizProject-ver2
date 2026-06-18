/**
 * 주문 검색 Admin API (한국형 — 결제/배송상태 필터 보강)
 *
 *  GET /admin/orders-kr/search
 *    ?q= &status= &payment_status= &fulfillment_status= &from= &to= &limit= &offset=
 *
 * 배경: Medusa 코어 /admin/orders 는 payment_status·fulfillment_status 로 서버 필터를
 *       지원하지 않는다(계산필드 → 어떤 값이든 무시되고 전체 반환). 주문/배송 화면의
 *       "결제완료/배송준비/배송중/배송완료" 탭이 동작하지 않던 근본 원인.
 *
 * 처리:
 *   ① 코어와 동일하게 getOrdersListWorkflow 로 주문을 조회(= total·payment_status·
 *      fulfillment_status 가 정확히 계산됨. raw query.graph 로는 계산필드가 비거나
 *      "Shipping method version" 오류 발생).
 *   ② 서버 필터 가능한 status(주문상태)·created_at 범위는 워크플로우 filters 로 선반영.
 *   ③ 계산필드(payment_status·fulfillment_status)와 키워드 q 는 메모리 필터 →
 *      count·페이지네이션을 필터 결과 기준으로 정확히 반환.
 *
 * 단독몰 운영 규모를 가정해 최대 MAX_SCAN 건까지 스캔한다(초과 시 경고 로그).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"

const ALLOWED_STATUS = ["pending", "completed", "canceled", "archived", "requires_action", "draft"]
const MAX_SCAN = 2000

const LIST_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "total",
  "currency_code",
  "email",
  "created_at",
  "customer.first_name",
  "customer.last_name",
  "items.quantity",
]

function str(v: unknown): string | undefined {
  if (Array.isArray(v)) v = v[0]
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

/** 콤마구분 다중값 파싱(예: "shipped,partially_shipped"). 배송탭은 한 탭에 여러 상태 매핑. */
function multi(v: unknown): string[] {
  const s = str(v)
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = str(req.query.q)
  const status = str(req.query.status)
  const paymentStatuses = multi(req.query.payment_status)
  const fulfillmentStatuses = multi(req.query.fulfillment_status)
  const from = str(req.query.from)
  const to = str(req.query.to)
  const limit = Math.max(1, Number(req.query.limit ?? 20))
  const offset = Math.max(0, Number(req.query.offset ?? 0))

  // ── 서버 필터(주문상태·기간) ─────────────────────────────────
  const filters: Record<string, unknown> = { is_draft_order: false }
  if (status && ALLOWED_STATUS.includes(status)) {
    filters.status = status
  }
  if (from || to) {
    const createdAt: Record<string, string> = {}
    if (from) {
      const d = new Date(from)
      if (!isNaN(d.getTime())) createdAt.$gte = d.toISOString()
    }
    if (to) {
      const d = new Date(to)
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999)
        createdAt.$lte = d.toISOString()
      }
    }
    if (Object.keys(createdAt).length) filters.created_at = createdAt
  }

  // ── ① 코어 워크플로우로 조회(계산필드 정확) ──────────────────
  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: LIST_FIELDS,
      variables: { filters, skip: 0, take: MAX_SCAN },
    },
  })

  let list = ((result as any)?.rows ?? []) as any[]

  if (list.length >= MAX_SCAN) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.warn(`[orders-kr/search] 스캔 상한(${MAX_SCAN}) 도달 — 결과가 잘릴 수 있습니다.`)
  }

  // 최신순(display_id DESC)
  list.sort((a, b) => (b.display_id ?? 0) - (a.display_id ?? 0))

  // ── ③ 메모리 필터(계산필드 + 키워드) ─────────────────────────
  if (paymentStatuses.length) list = list.filter((o) => paymentStatuses.includes(o.payment_status))
  if (fulfillmentStatuses.length) list = list.filter((o) => fulfillmentStatuses.includes(o.fulfillment_status))
  if (q) {
    const qq = q.toLowerCase()
    list = list.filter((o) => {
      const name = `${o.customer?.last_name ?? ""}${o.customer?.first_name ?? ""}`.toLowerCase()
      return (
        String(o.display_id).includes(q) ||
        (o.email ?? "").toLowerCase().includes(qq) ||
        name.includes(qq)
      )
    })
  }

  // ── 페이지네이션 ─────────────────────────────────────────────
  const count = list.length
  const orders = list.slice(offset, offset + limit)

  res.json({ orders, count })
}

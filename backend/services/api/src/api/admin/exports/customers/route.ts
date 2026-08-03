/**
 * 회원 CSV 내보내기 Admin API (2026-08-03 신설)
 *
 *   GET /admin/exports/customers?from=2026-01-01&to=2026-01-31
 *
 * 용도: 회원 현황 보고, 등급별 마케팅 타겟 추출, 휴면 전환 대상 확인.
 *
 * 권한: RBAC `members` 메뉴 read 권한.
 *
 * ⚠️ 개인정보가 담긴 파일이 생성된다. 내려받은 파일의 관리 책임은 운영자에게 있다
 *    (개인정보보호법상 파기 의무 포함). 자동화 테스트 계정은 기본으로 제외한다 —
 *    포함하려면 ?include_test=true.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { CUSTOMER_POINT_MODULE } from "../../../../modules/customer-point"
import { toCsv, sendCsv, kstDateTime, parsePeriod, MAX_ROWS } from "../_csv"

const HEADERS = [
  "회원ID",
  "이메일",
  "이름",
  "연락처",
  "가입일시",
  "회원등급",
  "누적구매액",
  "보유적립금",
  "주문건수",
]

/** 자동화가 만든 테스트 계정 도메인 — 기본 제외(통계 왜곡 방지) */
const TEST_DOMAINS = /@kr-(audit|e2e|itest|smoke|verify|test)\.local$/

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { from, to } = parsePeriod(req.query as Record<string, unknown>)
  const includeTest = String((req.query as any)?.include_test) === "true"

  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "last_name", "phone", "created_at"],
  })

  let customers = (data ?? []) as any[]
  if (!includeTest) customers = customers.filter((c) => !TEST_DOMAINS.test(String(c.email ?? "")))
  if (from) customers = customers.filter((c) => new Date(c.created_at) >= from)
  if (to) customers = customers.filter((c) => new Date(c.created_at) <= to)
  customers.sort((a, b) => (String(a.created_at) < String(b.created_at) ? 1 : -1))

  const truncated = customers.length > MAX_ROWS
  if (truncated) customers = customers.slice(0, MAX_ROWS)

  // 주문 건수는 한 번에 모아 집계한다(회원 수만큼 쿼리하면 수천 번이 된다).
  const orderCount = new Map<string, number>()
  try {
    const { data: orders } = await query.graph({ entity: "order", fields: ["id", "customer_id"] })
    for (const o of (orders ?? []) as any[]) {
      if (!o.customer_id) continue
      orderCount.set(o.customer_id, (orderCount.get(o.customer_id) ?? 0) + 1)
    }
  } catch {
    // 집계 실패 시 0 으로 둔다 — 내보내기 자체는 막지 않는다.
  }

  const membership = req.scope.resolve(MEMBERSHIP_MODULE) as any
  const points = req.scope.resolve(CUSTOMER_POINT_MODULE) as any

  // 등급·적립금도 일괄 조회 후 매핑(회원별 개별 조회 금지 — N+1 방지)
  const tierBy = new Map<string, { tier: string; accrued: number }>()
  try {
    for (const m of (await membership.listCustomerMemberships({})) as any[]) {
      tierBy.set(m.customer_id, { tier: m.current_tier, accrued: Number(m.accrued_amount ?? 0) })
    }
  } catch {
    // 등급 미사용 환경이면 빈 값
  }
  const balanceBy = new Map<string, number>()
  try {
    for (const l of (await points.listPointLedgers({})) as any[]) {
      const cur = balanceBy.get(l.customer_id) ?? 0
      balanceBy.set(l.customer_id, cur + Number(l.amount ?? 0))
    }
  } catch {
    // 적립금 미사용 환경이면 빈 값
  }

  const rows = customers.map((c) => {
    const m = tierBy.get(c.id)
    return [
      c.id,
      c.email ?? "",
      [c.last_name, c.first_name].filter(Boolean).join("") || "",
      c.phone ?? "",
      kstDateTime(c.created_at),
      m?.tier ?? "",
      m?.accrued ?? 0,
      Math.max(0, balanceBy.get(c.id) ?? 0),
      orderCount.get(c.id) ?? 0,
    ]
  })

  if (truncated) {
    rows.push([`※ ${MAX_ROWS}건을 초과해 잘렸습니다. 기간(from/to)을 좁혀 다시 받으세요.`])
  }

  sendCsv(res, "회원목록", toCsv(HEADERS, rows), "customers")
}

/**
 * 대시보드 집계 Admin API
 *
 *  - GET /admin/dashboard/stats
 *      실 Medusa DB 를 query graph 로 조회해 관리자 대시보드 지표를 집계 반환한다.
 *
 * 메두사 코어/DB 스키마는 건드리지 않고 query.graph 로 읽기만 한다.
 * 데이터가 없거나 필드가 안 잡히면 0/빈배열 로 보수 처리(가짜 수치 금지).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// KST(UTC+9) 기준 날짜 키(YYYY-MM-DD) 산출
function kstDateKey(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

// KST 기준 "M/D" 라벨
function kstShortLabel(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? Number(n) : 0
}

function pct(today: number, yesterday: number): number {
  if (!yesterday) return 0
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // 안전 조회 헬퍼 — 실패 시 빈 배열
  const safeGraph = async (config: Record<string, unknown>): Promise<any[]> => {
    try {
      const { data } = await query.graph(config as any)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  // ---- 데이터 적재 ----
  let orders = await safeGraph({
    entity: "order",
    fields: [
      "id",
      "total",
      "item_total",
      "currency_code",
      "created_at",
      "status",
      "payment_status",
      "fulfillment_status",
      "items.quantity",
      "items.total",
      "items.product_id",
    ],
    pagination: { take: 1000, skip: 0 },
  })
  // 일부 필드가 막히면 최소 필드로 재시도
  if (orders.length === 0) {
    orders = await safeGraph({
      entity: "order",
      fields: ["id", "total", "created_at", "status"],
      pagination: { take: 1000, skip: 0 },
    })
  }

  const products = await safeGraph({ entity: "product", fields: ["id", "status"] })
  const customers = await safeGraph({
    entity: "customer",
    fields: ["id", "created_at"],
  })
  const categories = await safeGraph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  // ---- 날짜 기준 ----
  const now = new Date()
  const todayKey = kstDateKey(now)
  const yesterdayKey = kstDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))

  // ---- 매출/주문 (오늘/어제) ----
  let todayRevenue = 0
  let yesterdayRevenue = 0
  let todayOrders = 0
  let yesterdayOrders = 0

  for (const o of orders) {
    const key = o?.created_at ? kstDateKey(new Date(o.created_at)) : null
    const total = toNum(o?.total)
    if (key === todayKey) {
      todayRevenue += total
      todayOrders += 1
    } else if (key === yesterdayKey) {
      yesterdayRevenue += total
      yesterdayOrders += 1
    }
  }

  // ---- 상태 버킷 카운트 ----
  const PAY_PENDING = new Set(["not_paid", "awaiting", "requires_action"])
  const PAY_REFUND = new Set(["refunded", "partially_refunded"])
  const FULFILL_PENDING = new Set(["not_fulfilled", "partially_fulfilled"])

  let paymentPending = 0
  let fulfillPending = 0
  let cancelRefund = 0

  for (const o of orders) {
    const ps = String(o?.payment_status ?? "")
    const fs = String(o?.fulfillment_status ?? "")
    const st = String(o?.status ?? "")

    if (PAY_PENDING.has(ps)) paymentPending += 1
    if (st !== "canceled" && FULFILL_PENDING.has(fs)) fulfillPending += 1
    if (st === "canceled" || PAY_REFUND.has(ps)) cancelRefund += 1
  }

  // ---- 신규 회원 (오늘/어제) ----
  let newMembers = 0
  let yesterdayMembers = 0
  for (const c of customers) {
    const key = c?.created_at ? kstDateKey(new Date(c.created_at)) : null
    if (key === todayKey) newMembers += 1
    else if (key === yesterdayKey) yesterdayMembers += 1
  }

  // ---- 최근 7일 매출 추이 ----
  const revenueTrend: { date: string; gross: number; net: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = kstDateKey(day)
    let gross = 0
    let net = 0
    for (const o of orders) {
      const oKey = o?.created_at ? kstDateKey(new Date(o.created_at)) : null
      if (oKey === key) {
        gross += toNum(o?.total)
        net += toNum(o?.item_total)
      }
    }
    revenueTrend.push({
      date: kstShortLabel(day),
      gross,
      net: net || gross,
    })
  }

  // ---- 주문 상태 분포 (5버킷) ----
  let paidBucket = 0
  let readyBucket = 0
  let shippingBucket = 0
  let deliveredBucket = 0
  let cancelBucket = 0

  for (const o of orders) {
    const ps = String(o?.payment_status ?? "")
    const fs = String(o?.fulfillment_status ?? "")
    const st = String(o?.status ?? "")

    if (st === "canceled" || PAY_REFUND.has(ps)) {
      cancelBucket += 1
    } else if (fs === "delivered" || st === "completed") {
      deliveredBucket += 1
    } else if (fs === "shipped" || fs === "partially_shipped") {
      shippingBucket += 1
    } else if (FULFILL_PENDING.has(fs)) {
      readyBucket += 1
    } else if (ps === "captured" || ps === "paid") {
      paidBucket += 1
    }
  }

  const orderStatusDist = [
    { label: "결제완료", value: paidBucket },
    { label: "배송준비", value: readyBucket },
    { label: "배송중", value: shippingBucket },
    { label: "배송완료", value: deliveredBucket },
    { label: "취소·환불", value: cancelBucket },
  ]

  // ---- 카테고리별 매출 비중 ----
  // line item product_id -> category 매핑 후 매출 합산
  let categoryShare: { label: string; value: number }[] = []
  try {
    // 주문에 등장한 product_id 수집
    const productIds = new Set<string>()
    for (const o of orders) {
      for (const it of o?.items ?? []) {
        if (it?.product_id) productIds.add(String(it.product_id))
      }
    }

    if (productIds.size > 0) {
      const prodCats = await safeGraph({
        entity: "product",
        fields: ["id", "categories.id", "categories.name"],
        filters: { id: Array.from(productIds) },
      })

      // product_id -> 대표 카테고리명
      const prodToCat = new Map<string, string>()
      for (const p of prodCats) {
        const cat = (p?.categories ?? [])[0]
        if (p?.id && cat?.name) prodToCat.set(String(p.id), String(cat.name))
      }

      const catRevenue = new Map<string, number>()
      for (const o of orders) {
        for (const it of o?.items ?? []) {
          const cname = prodToCat.get(String(it?.product_id))
          if (!cname) continue
          catRevenue.set(cname, (catRevenue.get(cname) ?? 0) + toNum(it?.total))
        }
      }

      const sorted = Array.from(catRevenue.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)

      if (sorted.length > 4) {
        const top4 = sorted.slice(0, 4)
        const rest = sorted
          .slice(4)
          .reduce((sum, c) => sum + c.value, 0)
        categoryShare = [...top4, { label: "기타", value: rest }]
      } else {
        categoryShare = sorted
      }
    }
  } catch {
    categoryShare = []
  }

  // ---- 응답 ----
  res.json({
    stats: {
      currency: "krw",
      todayRevenue,
      yesterdayRevenue,
      revenueChangePct: pct(todayRevenue, yesterdayRevenue),
      todayOrders,
      yesterdayOrders,
      ordersChangePct: pct(todayOrders, yesterdayOrders),
      paymentPending,
      fulfillPending,
      cancelRefund,
      newMembers,
      yesterdayMembers,
      newMembersChangePct: pct(newMembers, yesterdayMembers),
      revenueTrend,
      orderStatusDist,
      categoryShare,
      totals: {
        products: products.length,
        categories: categories.length,
        customers: customers.length,
      },
    },
  })
}

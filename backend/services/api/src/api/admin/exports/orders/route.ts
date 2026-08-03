/**
 * 주문 CSV 내보내기 Admin API (2026-08-03 신설)
 *
 *   GET /admin/exports/orders?from=2026-01-01&to=2026-01-31
 *
 * 왜 만들었나: 어드민 화면에 이미 클라이언트측 CSV 다운로드가 있었지만, 목록 API 기준이라
 * 컬럼이 8개(주문번호·주문일시·고객명·수량·금액·상태)뿐이고 최대 1,000건이었다.
 * 택배사 대량발송 양식에는 **수령인·연락처·우편번호·주소·상품**이 필요하고,
 * 세무 자료에는 기간 전체가 필요해 서버측 내보내기를 별도로 만들었다(최대 50,000건).
 *
 * 권한: RBAC `orders` 메뉴 read 권한(미들웨어에서 판정). 주문에는 고객 개인정보가 포함되므로
 *       권한 없는 등급은 다운로드 자체가 403 이다.
 *
 * 주의: 개인정보가 담긴 파일이 생성된다. 다운로드 이력은 감사 로그(auditTap)에 남지 않는다
 *       — GET 이라 write 감사 대상이 아니다. 필요하면 별도 기록을 붙일 것.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { toCsv, sendCsv, kstDateTime, parsePeriod, MAX_ROWS } from "../_csv"

const HEADERS = [
  "주문번호",
  "주문일시",
  "주문자명",
  "이메일",
  "연락처",
  "우편번호",
  "배송지",
  "상품",
  "총수량",
  "상품금액",
  "배송비",
  "할인",
  "결제금액",
  "통화",
  "결제상태",
  "배송상태",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { from, to } = parsePeriod(req.query as Record<string, unknown>)

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "email",
      "currency_code",
      "item_total",
      "shipping_total",
      "discount_total",
      "total",
      "payment_status",
      "fulfillment_status",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.phone",
      "shipping_address.postal_code",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
      "items.title",
      "items.variant_title",
      "items.quantity",
    ],
  })

  let orders = (data ?? []) as any[]
  if (from) orders = orders.filter((o) => new Date(o.created_at) >= from)
  if (to) orders = orders.filter((o) => new Date(o.created_at) <= to)
  orders.sort((a, b) => (String(a.created_at) < String(b.created_at) ? 1 : -1))

  const truncated = orders.length > MAX_ROWS
  if (truncated) orders = orders.slice(0, MAX_ROWS)

  const rows = orders.map((o) => {
    const a = o.shipping_address ?? {}
    const name = [a.last_name, a.first_name].filter(Boolean).join("") || "-"
    const addr = [a.city, a.address_1, a.address_2].filter(Boolean).join(" ")
    const items = (o.items ?? []) as any[]
    // 한 셀에 상품을 모아 넣는다 — 주문 1건 = 1행이어야 엑셀에서 다루기 쉽다.
    const itemText = items
      .map((i) => `${i.title}${i.variant_title ? `(${i.variant_title})` : ""} x${i.quantity}`)
      .join(" / ")
    const qty = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0)
    return [
      o.display_id ?? o.id,
      kstDateTime(o.created_at),
      name,
      o.email ?? "",
      a.phone ?? "",
      a.postal_code ?? "",
      addr,
      itemText,
      qty,
      Number(o.item_total ?? 0),
      Number(o.shipping_total ?? 0),
      Number(o.discount_total ?? 0),
      Number(o.total ?? 0),
      o.currency_code ?? "",
      o.payment_status ?? "",
      o.fulfillment_status ?? "",
    ]
  })

  if (truncated) {
    // 잘렸다는 사실을 파일 안에 남긴다 — 조용한 누락이 가장 위험하다.
    rows.push([`※ ${MAX_ROWS}건을 초과해 잘렸습니다. 기간(from/to)을 좁혀 다시 받으세요.`])
  }

  sendCsv(res, "주문내역", toCsv(HEADERS, rows), "orders")
}

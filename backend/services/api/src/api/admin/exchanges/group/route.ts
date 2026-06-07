/**
 * 다건 교환 그룹 생성 Admin API
 *
 *  POST /admin/exchanges/group   { order_id, exchange_ids[], pickup_tracking_no? }
 *
 * - exchange_group 모듈의 createGroup 을 호출합니다.
 * - exchange_ids 배열의 교환 라인들을 조회해 calcExchangeDiff 로 그룹 총차액을 계산합니다.
 * - 1회 회수 운송장(pickup_tracking_no)을 그룹에 기록합니다.
 * - 로직 복사 금지 — 모듈 서비스 호출/래핑.
 *
 * spec: t005_교환.md §6 API2, unit_007 UT-002.
 *
 * import depth: src/api/admin/exchanges/group/route.ts → modules = ../../../../modules (4단계)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ORDER_EXCHANGE_GROUP_MODULE } from "../../../../modules/order-exchange-group"
import OrderExchangeGroupModuleService from "../../../../modules/order-exchange-group/service"
import { calcExchangeDiff, type DiffLineItem } from "./exchange-diff-logic"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    order_id?: string
    exchange_ids?: string[]
    pickup_tracking_no?: string
  }

  // 입력 검증
  if (!body.order_id) {
    return res.status(400).json({ message: "order_id 는 필수입니다." })
  }
  if (!body.exchange_ids || body.exchange_ids.length === 0) {
    return res.status(400).json({ message: "exchange_ids 는 1개 이상 필요합니다." })
  }

  // 1. exchange_ids 라인들을 ORDER 모듈에서 조회해 차액 계산
  //    각 exchange 에 연결된 order item 라인들을 합산해 calcExchangeDiff 호출
  const orderModuleService = req.scope.resolve(Modules.ORDER) as any

  // exchange_ids 에 해당하는 교환(exchange) 목록 조회
  const exchanges: any[] = await orderModuleService.listExchanges(
    { id: body.exchange_ids },
    { relations: ["additional_items", "return_items"] }
  ).catch(() => [])

  // 교환 라인들을 DiffLineItem 배열로 변환해 총차액 계산
  const returnDiffItems: DiffLineItem[] = []
  const additionalDiffItems: DiffLineItem[] = []

  for (const exchange of exchanges) {
    // 회수(return) 라인
    for (const ri of exchange.return_items ?? []) {
      returnDiffItems.push({
        id: ri.id ?? ri.item_id ?? "",
        unit_price: Number(ri.unit_price ?? 0),
        quantity: Number(ri.quantity ?? 0),
      })
    }
    // 신규 배송(additional) 라인
    for (const ai of exchange.additional_items ?? []) {
      additionalDiffItems.push({
        id: ai.id ?? ai.variant_id ?? "",
        unit_price: Number(ai.unit_price ?? 0),
        quantity: Number(ai.quantity ?? 0),
      })
    }
  }

  // calcExchangeDiff — 그룹 총차액 계산 (절사 + 잔액보정)
  const diffResult = calcExchangeDiff(returnDiffItems, additionalDiffItems)

  const svc = req.scope.resolve(
    ORDER_EXCHANGE_GROUP_MODULE
  ) as unknown as OrderExchangeGroupModuleService

  let group: any
  try {
    group = await svc.createGroup(
      body.order_id,
      body.exchange_ids,
      body.pickup_tracking_no
    )

    // total_price_diff 갱신 (createGroup 이 0으로 초기화하므로 생성 후 업데이트)
    if (diffResult.diff !== 0) {
      group = await (svc as any).updateExchangeGroups(
        { id: group.id },
        { total_price_diff: diffResult.diff }
      ).then((res: any) => (Array.isArray(res) ? res[0] : res)).catch(() => group)
    }
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? 400
    return res.status(status >= 400 && status < 600 ? status : 400).json({
      message: err?.message ?? "교환 그룹 생성에 실패했습니다.",
    })
  }

  return res.status(200).json({ group, price_diff: diffResult })
}

/**
 * 일괄발송 Admin API
 *
 *  POST /admin/orders-kr/bulk-ship
 *  {
 *    items: [
 *      {
 *        order_id: string,
 *        fulfillment_id?: string,   // 미전달 시 활성 fulfillment 자동 탐색
 *        carrier_code: string,       // cj | epost | hanjin | lotte | logen
 *        tracking_number: string,    // 하이픈 허용, 정규화 후 저장
 *        items?: { id: string; quantity: number }[]  // 미전달 시 전체 라인 적용
 *      }
 *    ]
 *  }
 *
 *  처리 흐름:
 *    ① 요청 전체 검증 (validateBulkShipRequest)
 *    ② 개별 항목 형식 검증 (validateBulkShipItem)
 *    ③ 각 주문의 활성 fulfillment 조회 (fulfillment_id 미전달 시)
 *    ④ Medusa createOrderShipmentWorkflow 호출 (항목별 순차 처리)
 *    ⑤ 처리 결과 집계 (성공/실패 목록) 반환
 *
 *  주의:
 *    - 부분 성공 가능 (실패 항목만 errors 배열로 반환, 성공 항목은 processed 배열)
 *    - 최대 100건 처리 (BULK_SHIP_MAX)
 *    - 동일 order_id 중복 요청 → 400 거부 (validateBulkShipRequest)
 *
 * spec: d6 배송관리 — 일괄발송
 * §V0-2: Medusa 코어 createOrderShipmentWorkflow 래핑. 로직 복사 금지.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
/**
 * createOrderShipmentWorkflow: /admin/orders/:id/fulfillments/:fid/shipments 에서
 * 사용하는 주문 기반 발송 워크플로우 (order_id + fulfillment_id + items 입력 지원).
 * createShipmentWorkflow(fulfillment 전용 — id만 받음)와 다름.
 */
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"
import {
  validateBulkShipRequest,
  validateBulkShipItem,
  buildBulkShipLabel,
  type BulkShipItem,
} from "./bulk-ship-logic"

/** 처리 결과 — 성공 1건 */
type ProcessedResult = {
  order_id: string
  fulfillment_id: string
  carrier_code: string
  tracking_number: string
}

/** 처리 결과 — 실패 1건 */
type ErrorResult = {
  order_id: string
  error: string
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { items?: BulkShipItem[] }

  // ── ① 요청 전체 검증 ──────────────────────────────────────────────────────
  const requestValidation = validateBulkShipRequest(body.items ?? [])
  if (!requestValidation.valid) {
    res.status(400).json({ message: requestValidation.error })
    return
  }

  const items = body.items!
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const processed: ProcessedResult[] = []
  const errors: ErrorResult[] = []

  // ── ④ 항목별 순차 처리 ────────────────────────────────────────────────────
  for (const item of items) {

    // ── ② 개별 항목 형식 검증 ─────────────────────────────────────────────
    const itemValidation = validateBulkShipItem(item)
    if (!itemValidation.valid) {
      errors.push({ order_id: item.order_id, error: itemValidation.error })
      continue
    }

    const { carrier_code, normalized_tracking } = itemValidation
    let fulfillmentId = item.fulfillment_id?.trim() ?? null

    // ── ③ 활성 fulfillment 자동 탐색 (fulfillment_id 미전달 시) ────────────
    if (!fulfillmentId) {
      try {
        const { data: orderData } = await query.graph({
          entity: "order",
          fields: ["id", "fulfillments.id", "fulfillments.canceled_at", "fulfillments.shipped_at"],
          filters: { id: item.order_id },
        })
        const order = orderData?.[0] as any
        const fulfillments: Array<{ id: string; canceled_at: string | null; shipped_at: string | null }> =
          order?.fulfillments ?? []
        // 취소되지 않고 아직 발송처리 안 된 fulfillment 우선 선택
        const active =
          fulfillments.find((f) => f.canceled_at == null && f.shipped_at == null) ??
          fulfillments.find((f) => f.canceled_at == null) ??
          null
        if (!active) {
          errors.push({
            order_id: item.order_id,
            error: "활성 출고(fulfillment) 정보가 없습니다. 먼저 출고 처리하세요.",
          })
          continue
        }
        fulfillmentId = active.id
      } catch (e) {
        errors.push({
          order_id: item.order_id,
          error: `주문 조회 실패: ${(e as Error).message}`,
        })
        continue
      }
    }

    // ── ④-a 라인 아이템 결정 ──────────────────────────────────────────────
    let shipItems: { id: string; quantity: number }[] = item.items ?? []
    if (shipItems.length === 0) {
      // 전체 라인 자동 조회
      try {
        const { data: orderData } = await query.graph({
          entity: "order",
          fields: ["id", "items.id", "items.quantity"],
          filters: { id: item.order_id },
        })
        const order = orderData?.[0] as any
        shipItems = (order?.items ?? []).map((i: any) => ({ id: i.id, quantity: i.quantity }))
        if (shipItems.length === 0) {
          errors.push({
            order_id: item.order_id,
            error: "주문 라인 아이템이 없습니다.",
          })
          continue
        }
      } catch (e) {
        errors.push({
          order_id: item.order_id,
          error: `라인 아이템 조회 실패: ${(e as Error).message}`,
        })
        continue
      }
    }

    // ── ④-b Medusa createOrderShipmentWorkflow 호출 ──────────────────────
    // createOrderShipmentWorkflow = order_id + fulfillment_id + items + labels 지원.
    // (createShipmentWorkflow 는 fulfillment id 단독 전용으로 order_id 미지원)
    const label = buildBulkShipLabel(carrier_code, normalized_tracking)
    try {
      await createOrderShipmentWorkflow(req.scope).run({
        input: {
          order_id: item.order_id,
          fulfillment_id: fulfillmentId,
          items: shipItems,
          labels: [label],
        },
      })
      processed.push({
        order_id: item.order_id,
        fulfillment_id: fulfillmentId,
        carrier_code,
        tracking_number: normalized_tracking,
      })
    } catch (e) {
      errors.push({
        order_id: item.order_id,
        error: `발송 처리 실패: ${(e as Error).message}`,
      })
    }
  }

  // ── ⑤ 결과 반환 ──────────────────────────────────────────────────────────
  const allFailed = processed.length === 0 && errors.length > 0
  res.status(allFailed ? 422 : 200).json({
    processed_count: processed.length,
    error_count: errors.length,
    processed,
    errors,
  })
}

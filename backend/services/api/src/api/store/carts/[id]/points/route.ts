/**
 * 적립금 사용 Store API (체크아웃 포인트 차감)
 *  - POST   /store/carts/:id/points { points } → 적립금만큼 주문 할인 적용 + 원장 차감
 *  - DELETE /store/carts/:id/points            → 적용 취소(할인 제거 + 적립금 복원)
 * 인증: 로그인 고객 본인 카트. 보유 적립금/주문금액 초과 불가.
 * 방식: 적립금 = 1회용 프로모션(fixed)으로 카트에 적용 + customer-point redeem 적재.
 * 동시성(보안점검 2026-07-27 A2): per-cart 락(Modules.LOCKING)으로 임계구역 직렬화 →
 *   동시 POST 이중차감 / 동시 DELETE 이중복원(포인트 인플레) 방지.
 * 가드레일: Medusa core 미수정(core-flows + customer-point 모듈 사용).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils"
import {
  createPromotionsWorkflow,
  updateCartPromotionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { CUSTOMER_POINT_MODULE } from "../../../../../modules/customer-point"
import type CustomerPointModuleService from "../../../../../modules/customer-point/service"

function pointsCode(cartId: string) {
  return `POINTS-${cartId.slice(-12)}`
}

async function getCart(req: MedusaRequest, cartId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "item_total",
      "tax_total",
      "currency_code",
      "customer_id",
      "promotions.code",
    ],
    filters: { id: cartId } as Record<string, unknown>,
  })
  return (data ?? [])[0] as any
}

const LOCK_ARGS = { timeout: 10 } // 초

/**
 * 적립금 할인의 과세 기준(2026-07-28 측정으로 확인된 이슈)
 *
 * Medusa 프로모션은 **공급가액(pre-tax)** 에 적용된다. 그래서 1,000p 를 쓰면
 * 최종 결제액은 1,100원 줄어든다(부가세 10% 가 할인에 얹힘 = 고객이 10% 초과 혜택).
 * 실측: item_total 16,500 → 15,400 / tax 1,500 → 1,400 / 사용 1,000p → 총액 -1,100
 *
 * 회계 정책상 "1p = 최종 결제액 1원" 이 맞다면 POINTS_DISCOUNT_POST_TAX=true 로 켠다.
 * (프로모션 값을 세율로 나눠 등록 → 세금 포함 총액이 정확히 사용액만큼 감소)
 * 기본은 OFF — 기존 동작을 바꾸지 않는다(운영 전환 시 회계와 합의 후 결정).
 */
const POST_TAX_POINTS = process.env.POINTS_DISCOUNT_POST_TAX === "true"

/** 카트의 실효 세율로 프로모션 값 보정(post-tax 모드에서만) */
function promotionValueFor(points: number, cart: any): number {
  if (!POST_TAX_POINTS) return points
  const itemTotal = Number(cart?.item_total ?? 0)
  const taxTotal = Number(cart?.tax_total ?? 0)
  const net = itemTotal - taxTotal
  if (net <= 0 || taxTotal <= 0) return points
  const rate = taxTotal / net
  return Math.round(points / (1 + rate))
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const cartId = req.params.id
  const points = Math.floor(Number((req.body as any)?.points))
  if (!points || points <= 0) {
    res.status(400).json({ message: "사용할 적립금을 입력해 주세요." })
    return
  }

  const pointSvc = req.scope.resolve(
    CUSTOMER_POINT_MODULE
  ) as unknown as CustomerPointModuleService
  const balance = await pointSvc.getBalance(customerId)
  if (points > balance) {
    res.status(400).json({ message: `보유 적립금(${balance}원)을 초과했습니다.` })
    return
  }

  const cart = await getCart(req, cartId)
  if (!cart) {
    res.status(404).json({ message: "장바구니를 찾을 수 없습니다." })
    return
  }
  // 보안점검(IDOR): 본인 소유 장바구니만 허용
  if (cart.customer_id !== customerId) {
    res.status(403).json({ message: "본인 장바구니에만 적립금을 사용할 수 있습니다." })
    return
  }
  if (points > cart.item_total) {
    res.status(400).json({ message: "주문 금액을 초과해 사용할 수 없습니다." })
    return
  }

  const code = pointsCode(cartId)
  const locking = req.scope.resolve(Modules.LOCKING) as any

  try {
    const out: { status: number; body: any } = await locking.execute(
      `points-cart:${cartId}`,
      async () => {
        // 락 내부에서 최신 상태 재확인(이미 적용 여부)
        const fresh = await getCart(req, cartId)
        const already = (fresh?.promotions ?? []).some((p: any) => p.code === code)
        if (already) {
          return { status: 409, body: { message: "이미 적립금이 적용되어 있습니다." } }
        }

        // 1) 1회용 프로모션 생성(없으면) + 카트 적용
        try {
          await createPromotionsWorkflow(req.scope).run({
            input: {
              promotionsData: [
                {
                  code,
                  type: "standard",
                  status: "active",
                  application_method: {
                    type: "fixed",
                    // POINTS_DISCOUNT_POST_TAX=true 면 세금 포함 총액이 정확히 points 만큼 줄도록 보정
                    value: promotionValueFor(points, cart),
                    currency_code: cart.currency_code,
                    target_type: "order",
                  },
                } as any,
              ],
            },
          })
        } catch {
          // 동일 코드 프로모션 존재 시 재사용
        }
        await updateCartPromotionsWorkflow(req.scope).run({
          input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.ADD },
        })

        // 2) 적립금 원장 차감
        try {
          // 사유에 cartId 를 남긴다 — 취소(DELETE) 시 "실제 차감액" 을 정확히 되돌리기 위함.
          // (프로모션 값은 과세기준 보정으로 차감액과 다를 수 있으므로 원장을 기준으로 삼는다)
          await pointSvc.redeemPoints(customerId, points, `주문 적립금 사용 (cart:${cartId})`)
        } catch (e) {
          await updateCartPromotionsWorkflow(req.scope)
            .run({ input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.REMOVE } })
            .catch(() => {})
          console.warn(`[points] redeem 실패(cart=${cartId}): ${(e as Error)?.message}`)
          return { status: 400, body: { message: "적립금 사용에 실패했습니다. 잔액과 입력값을 확인해 주세요." } }
        }
        return { status: 200, body: { applied: points, balance_after: balance - points } }
      },
      LOCK_ARGS
    )
    res.status(out.status).json(out.body)
  } catch (e) {
    console.warn(`[points] 락/처리 오류(cart=${cartId}): ${(e as Error)?.message}`)
    res.status(409).json({ message: "적립금 처리가 진행 중입니다. 잠시 후 다시 시도해 주세요." })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const cartId = req.params.id
  const cart = await getCart(req, cartId)
  if (!cart) {
    res.status(404).json({ message: "장바구니를 찾을 수 없습니다." })
    return
  }
  // 보안점검(IDOR): 본인 소유 장바구니만 허용
  if (cart.customer_id !== customerId) {
    res.status(403).json({ message: "본인 장바구니만 처리할 수 있습니다." })
    return
  }

  const code = pointsCode(cartId)
  const pointSvc = req.scope.resolve(
    CUSTOMER_POINT_MODULE
  ) as unknown as CustomerPointModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const locking = req.scope.resolve(Modules.LOCKING) as any

  try {
    const out: { status: number; body: any } = await locking.execute(
      `points-cart:${cartId}`,
      async () => {
        // 락 내부 재확인: 프로모션이 아직 적용돼 있을 때만 복원(동시 DELETE 이중복원 방지)
        const fresh = await getCart(req, cartId)
        const applied = (fresh?.promotions ?? []).find((p: any) => p.code === code)
        if (!applied) return { status: 200, body: { removed: false } }

        // 복원액 = 원장에 기록된 "실제 차감액"(프로모션 값이 아님).
        // POINTS_DISCOUNT_POST_TAX 모드에서는 프로모션 값이 차감액보다 작으므로
        // 프로모션 값으로 되돌리면 고객 적립금이 줄어든다.
        const ledger = await pointSvc.listLedger(customerId)
        const redeemRow = (ledger ?? []).find(
          (r: any) =>
            r.entry_type === "redeem" &&
            typeof r.reason === "string" &&
            r.reason.includes(`cart:${cartId}`)
        )
        let value = Math.abs(Number(redeemRow?.amount ?? 0))

        if (!value) {
          // 사유에 cartId 가 없던 과거 데이터 호환 — 프로모션 값으로 폴백
          const { data } = await query.graph({
            entity: "promotion",
            fields: ["code", "application_method.value"],
            filters: { code } as Record<string, unknown>,
          })
          value = Number((data ?? [])[0]?.application_method?.value ?? 0)
        }

        await updateCartPromotionsWorkflow(req.scope).run({
          input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.REMOVE },
        })
        if (value > 0) {
          await pointSvc.earnPoints(customerId, value, {
            validDays: 365,
            earnedAtIso: new Date().toISOString(),
            reason: "적립금 사용 취소",
          })
        }
        return { status: 200, body: { removed: true, restored: value } }
      },
      LOCK_ARGS
    )
    res.status(out.status).json(out.body)
  } catch (e) {
    console.warn(`[points] 락/처리 오류(cart=${cartId}): ${(e as Error)?.message}`)
    res.status(409).json({ message: "적립금 처리가 진행 중입니다. 잠시 후 다시 시도해 주세요." })
  }
}

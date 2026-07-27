/**
 * 적립금 사용 Store API (체크아웃 포인트 차감)
 *  - POST   /store/carts/:id/points { points } → 적립금만큼 주문 할인 적용 + 원장 차감
 *  - DELETE /store/carts/:id/points            → 적용 취소(할인 제거 + 적립금 복원)
 * 인증: 로그인 고객. 보유 적립금/주문금액 초과 불가.
 * 방식: 적립금 = 1회용 프로모션(fixed)으로 카트에 적용 + customer-point redeem 적재.
 * 가드레일: Medusa core 미수정(core-flows + customer-point 모듈 사용).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
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
    fields: ["id", "item_total", "currency_code", "customer_id", "promotions.code"],
    filters: { id: cartId } as Record<string, unknown>,
  })
  return (data ?? [])[0] as any
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
  // 보안점검 2026-07-27(IDOR): 본인 소유 장바구니만 허용(타인 카트 조작·적립금 탈취 방지)
  if (cart.customer_id !== customerId) {
    res.status(403).json({ message: "본인 장바구니에만 적립금을 사용할 수 있습니다." })
    return
  }
  if (points > cart.item_total) {
    res.status(400).json({ message: "주문 금액을 초과해 사용할 수 없습니다." })
    return
  }
  const code = pointsCode(cartId)
  const already = (cart.promotions ?? []).some((p: any) => p.code === code)
  if (already) {
    res.status(409).json({ message: "이미 적립금이 적용되어 있습니다." })
    return
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
              value: points,
              currency_code: cart.currency_code,
              target_type: "order",
            },
          } as any,
        ],
      },
    })
  } catch {
    // 이미 동일 코드 프로모션이 있으면 재사용(값 갱신은 생략 — 동일 카트 동일 코드)
  }
  await updateCartPromotionsWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      promo_codes: [code],
      action: PromotionActions.ADD,
    },
  })

  // 2) 적립금 원장 차감
  try {
    await pointSvc.redeemPoints(customerId, points, "주문 적립금 사용")
  } catch (e) {
    // 차감 실패 시 프로모션 제거(정합성)
    await updateCartPromotionsWorkflow(req.scope)
      .run({
        input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.REMOVE },
      })
      .catch(() => {})
    // 보안점검 2026-07-27: 내부 에러 메시지(제약/모듈명) 미노출 — 서버 로그로만 남기고 고정 메시지 반환
    console.warn(`[points] redeem 실패(cart=${cartId}): ${(e as Error)?.message}`)
    res.status(400).json({ message: "적립금 사용에 실패했습니다. 잔액과 입력값을 확인해 주세요." })
    return
  }

  res.json({ applied: points, balance_after: balance - points })
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
  // 보안점검 2026-07-27(IDOR): 본인 소유 장바구니만 허용(타인 카트 적립금 복원 탈취 방지)
  if (cart.customer_id !== customerId) {
    res.status(403).json({ message: "본인 장바구니만 처리할 수 있습니다." })
    return
  }
  const code = pointsCode(cartId)
  const applied = (cart.promotions ?? []).find((p: any) => p.code === code)
  if (!applied) {
    res.json({ removed: false })
    return
  }

  // 프로모션 값(=사용 적립금) 조회 후 복원
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "promotion",
    fields: ["code", "application_method.value"],
    filters: { code } as Record<string, unknown>,
  })
  const value = Number((data ?? [])[0]?.application_method?.value ?? 0)

  await updateCartPromotionsWorkflow(req.scope).run({
    input: { cart_id: cartId, promo_codes: [code], action: PromotionActions.REMOVE },
  })

  const pointSvc = req.scope.resolve(
    CUSTOMER_POINT_MODULE
  ) as unknown as CustomerPointModuleService
  if (value > 0) {
    await pointSvc.earnPoints(customerId, value, {
      validDays: 365,
      earnedAtIso: new Date().toISOString(),
      reason: "적립금 사용 취소",
    })
  }

  res.json({ removed: true, restored: value })
}

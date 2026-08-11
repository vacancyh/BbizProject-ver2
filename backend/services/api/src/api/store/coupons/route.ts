/**
 * 사용 가능한 쿠폰(활성 프로모션 코드) Store API
 *  - GET /store/coupons → 현재 active 인 프로모션 코드 목록(쿠폰함 노출용)
 * 표준 Medusa promotion(관리자 생성)을 고객에게 "사용 가능한 쿠폰"으로 노출.
 * 코드 적용은 체크아웃의 표준 promotion 흐름(`/store/carts/:id/promotions`)에서 처리.
 * 가드레일: Medusa core 미수정(조회만).
 *
 * ── 왜 문구를 여기서 만들지 않나 (2026-08-11) ───────────────────────────────
 * 예전에는 여기서 `"5,000원 할인 쿠폰"` 처럼 **완성된 한국어 문장**을 만들어 내려줬다.
 * 그러다 보니 스토어프론트를 영어로 바꿔도 쿠폰함만 한국어로 남았다 — 화면에서는
 * 받은 문자열을 그대로 찍을 수밖에 없으니 손쓸 방법이 없었다.
 *
 * 그래서 **판단에 필요한 값만** 내려준다(할인 종류·값·통화). 문장 조립은 화면이 한다.
 * `name` 은 운영자가 캠페인에 붙인 이름이 있을 때만 채우고, 없으면 null 을 준다
 * — 화면이 언어에 맞는 기본 문구를 만든다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "promotion",
    fields: [
      "id",
      "code",
      "status",
      "application_method.type",
      "application_method.value",
      "application_method.currency_code",
      "campaign.ends_at",
      "campaign.name",
    ],
    filters: { status: "active" } as Record<string, unknown>,
  })

  const coupons = (data ?? [])
    .filter((p: any) => p.code)
    .map((p: any) => {
      const am = p.application_method ?? {}
      const isPercentage = am.type === "percentage"
      return {
        id: p.id,
        code: p.code,
        /** 운영자가 붙인 캠페인 이름. 없으면 null — 화면이 기본 문구를 만든다. */
        name: p.campaign?.name ?? null,
        /** 할인 종류: "percentage" | "fixed" */
        discount_type: isPercentage ? "percentage" : "fixed",
        /** percentage 면 퍼센트 수치, fixed 면 금액 */
        discount_value: Number(am.value ?? 0),
        /** fixed 일 때의 통화(금액 표기에 필요) */
        currency_code: am.currency_code ?? null,
        min_order_amount: 0,
        expires_at: p.campaign?.ends_at
          ? p.campaign.ends_at instanceof Date
            ? p.campaign.ends_at.toISOString()
            : String(p.campaign.ends_at)
          : null,
        used: false,
      }
    })

  res.json({ coupons, availableCount: coupons.length })
}

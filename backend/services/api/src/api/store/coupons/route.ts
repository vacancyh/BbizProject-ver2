/**
 * 사용 가능한 쿠폰(활성 프로모션 코드) Store API
 *  - GET /store/coupons → 현재 active 인 프로모션 코드 목록(쿠폰함 노출용)
 * 표준 Medusa promotion(관리자 생성)을 고객에게 "사용 가능한 쿠폰"으로 노출.
 * 코드 적용은 체크아웃의 표준 promotion 흐름(`/store/carts/:id/promotions`)에서 처리.
 * 가드레일: Medusa core 미수정(조회만).
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
      const benefit =
        am.type === "percentage"
          ? `${Number(am.value)}%`
          : `${Number(am.value).toLocaleString("ko-KR")}원`
      return {
        id: p.id,
        code: p.code,
        name: p.campaign?.name ?? `${benefit} 할인 쿠폰`,
        benefit,
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

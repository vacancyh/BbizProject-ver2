import { listCustomerPoints } from "@lib/data/points"
import { HttpTypes } from "@medusajs/types"
import PointsForm from "./form"

// 로그인 고객만 노출. 보유 적립금 조회 + 현재 카트에 적용된 적립금(POINTS- 프로모션) 표시.
const PointsApply = async ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
}) => {
  if (!customer) return null

  const { summary } = await listCustomerPoints(customer.id)
  const balance = summary.balance

  // 적용된 적립금 프로모션 금액
  const code = `POINTS-${cart.id.slice(-12)}`
  const pointsPromo = (cart.promotions ?? []).find((p: any) => p.code === code)
  const applied = Number(
    (pointsPromo as any)?.application_method?.value ?? 0
  )

  if (balance <= 0 && applied <= 0) {
    return null
  }

  return (
    <PointsForm
      cartId={cart.id}
      balance={balance}
      applied={applied}
      currencyCode={cart.currency_code}
    />
  )
}

export default PointsApply

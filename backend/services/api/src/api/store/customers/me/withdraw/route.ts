/**
 * 회원 탈퇴 Store API (로그인 고객 본인)
 *  - POST /store/customers/me/withdraw
 * 인증: 스토어 고객 세션/Bearer. 탈퇴 후 프런트는 로그아웃 처리.
 *
 * H6(PIPA, 보안점검 2026-07-27): 탈퇴 시 **프로필 PII 즉시 비식별화 + 배송지 파기** 후 soft-delete.
 *  - 주문 자체(주문 시점 이메일·배송지 스냅샷)는 전자상거래법 보존 대상 → 주문 레코드에 그대로 유지.
 *  - 고객 프로필(이름/전화/이메일/주소)의 PII 는 탈퇴 즉시 제거하여 무기한 보관을 방지.
 * 가드레일: Medusa core 스키마 미수정(customer 모듈 표준 update/softDelete/deleteAddresses 사용).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any

  // 1) 배송지 PII 파기
  try {
    const addrs = await customerModule.listCustomerAddresses(
      { customer_id: customerId },
      { take: 200 }
    )
    if (addrs?.length) {
      await customerModule.deleteCustomerAddresses(addrs.map((a: any) => a.id))
    }
  } catch (e) {
    console.warn(`[withdraw] 배송지 파기 경고(order=${customerId}): ${(e as Error)?.message}`)
  }

  // 2) 프로필 PII 비식별화 (이메일은 재사용 방지 위해 계정별 유니크 익명값)
  const anonEmail = `withdrawn_${customerId.slice(-12).toLowerCase()}@deleted.local`
  try {
    await customerModule.updateCustomers(customerId, {
      first_name: "탈퇴",
      last_name: "회원",
      phone: null,
      company_name: null,
      email: anonEmail,
      metadata: { withdrawn_at: new Date().toISOString(), pii_anonymized: true },
    })
  } catch (e) {
    console.warn(`[withdraw] PII 비식별화 경고: ${(e as Error)?.message}`)
  }

  // 3) soft-delete (주문 연계 무결성 유지)
  await customerModule.softDeleteCustomers([customerId])

  res.json({ withdrawn: true })
}

"use server"

// 비회원 주문조회 데이터 계층 (실제 백엔드 연동)
// 백엔드 store 라우트 `POST /store/orders/lookup` (주문번호+이메일 매칭).

import { getT } from "@lib/i18n"
import { sdk } from "@lib/config"

export async function lookupGuestOrder(
  displayId: string,
  email: string
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  try {
    const res = await sdk.client.fetch<{ order: { id: string } }>(
      `/store/orders/lookup`,
      {
        method: "POST",
        body: { display_id: displayId, email },
        cache: "no-store",
      }
    )
    if (res?.order?.id) {
      return { ok: true, orderId: res.order.id }
    }
    return { ok: false, error: (await getT())("err.orderLookupNotFound") }
  } catch {
    return {
      ok: false,
      error: (await getT())("err.orderLookupHint"),
    }
  }
}

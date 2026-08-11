"use server"

// 주문 취소/반품/교환 신청 데이터 계층 (실제 백엔드 연동)
// 백엔드 store 라우트 `POST /store/orders/:id/request` (order-ops-kr 메모 → 관리자 처리).

import { getT } from "@lib/i18n"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type OrderRequestType = "cancel" | "return" | "exchange"

export async function confirmPurchase(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/orders/${orderId}/confirm`, {
      method: "POST",
      headers,
      body: {},
    })
    return { ok: true }
  } catch {
    return { ok: false, error: (await getT())("err.confirmPurchase") }
  }
}

export async function requestTaxReceipt(
  orderId: string,
  type: "cash_receipt" | "tax_invoice",
  payload: { identifier?: string; biz_no?: string; company_name?: string }
): Promise<{ ok: boolean; error?: string }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/orders/${orderId}/tax-receipt`, {
      method: "POST",
      headers,
      body: { type, ...payload },
    })
    return { ok: true }
  } catch {
    return { ok: false, error: (await getT())("err.requestInvalid") }
  }
}

export async function requestOrderAction(
  orderId: string,
  type: OrderRequestType,
  reason: string,
  comment?: string
): Promise<{ ok: boolean; error?: string }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/orders/${orderId}/request`, {
      method: "POST",
      headers,
      body: { type, reason, comment },
    })
    return { ok: true }
  } catch {
    return { ok: false, error: (await getT())("err.requestFailed") }
  }
}

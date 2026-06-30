"use server"

// 동의 관리 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트로 로그인 고객의 마케팅 수신 동의를 조회/기록한다.
//  - GET  /store/customers/me/consents → 채널별 현재 상태
//  - POST /store/customers/me/consents { channel, agreed } → 동의/철회 적재(append-only)
// (백엔드: src/api/store/customers/me/consents/route.ts · customer-consent 모듈/consent_log)

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type ConsentChannel = "marketing" | "sms" | "email"
export type ConsentState = Record<ConsentChannel, boolean>

const DEFAULTS: ConsentState = { marketing: false, sms: false, email: false }

export async function getConsents(): Promise<ConsentState> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    const res = await sdk.client.fetch<{ consents: ConsentState }>(
      `/store/customers/me/consents`,
      { method: "GET", headers, cache: "no-store" }
    )
    return res?.consents ?? { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function setConsent(
  channel: ConsentChannel,
  agreed: boolean
): Promise<ConsentState> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    const res = await sdk.client.fetch<{ consents: ConsentState }>(
      `/store/customers/me/consents`,
      { method: "POST", headers, body: { channel, agreed } }
    )
    return res?.consents ?? { ...DEFAULTS, [channel]: agreed }
  } catch {
    return { ...DEFAULTS, [channel]: agreed }
  }
}

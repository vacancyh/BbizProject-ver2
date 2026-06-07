/**
 * 동의 이력 API 클라이언트 — d5 t008_동의이력 갭B 백엔드 모듈 호출/래핑.
 *
 * 백엔드 route:
 *  - GET  /admin/consents/customers/:id           채널별 현재 동의 + 재확인 필요 채널
 *  - GET  /admin/consents/customers/:id/history    전체 동의/철회 이력(시각 타임라인)
 *  - POST /admin/consents/customers/:id           body={channel, agreed} 동의/철회 기록
 *
 * append-only consent_log(백엔드 영속 권위) 위 getStatus/getRecords 결과를 그대로 소비한다.
 * (로직 재구현 금지 — 최신/재확인 판정은 백엔드 logic.ts 단일 진실)
 */
import { apiFetch } from "./client";

/** 동의 채널 — 백엔드 logic.ts ConsentChannel 정합. */
export type ConsentChannel = "marketing" | "terms" | "privacy" | "sms" | "email";

/** 모든 동의 채널(표시 순서 = 백엔드 ALL_CONSENT_CHANNELS 정합). */
export const ALL_CONSENT_CHANNELS: ConsentChannel[] = [
  "marketing",
  "terms",
  "privacy",
  "sms",
  "email",
];

/** 채널 한글 라벨. */
export const CONSENT_CHANNEL_LABEL: Record<ConsentChannel, string> = {
  marketing: "마케팅 수신",
  terms: "이용약관",
  privacy: "개인정보 처리",
  sms: "SMS 수신",
  email: "이메일 수신",
};

/**
 * 고객 동의 상태 — GET /admin/consents/customers/:id 응답 정합.
 *  - consents: 채널별 현재 동의 여부(최신 기록 기준)
 *  - needs_reconsent: 동의 중 2년 경과로 재확인 필요한 채널
 */
export type ConsentStatus = {
  consents: Partial<Record<ConsentChannel, boolean>>;
  needs_reconsent: ConsentChannel[];
};

/** 기록 1건(POST 응답의 consent 행). */
export type ConsentLogRow = {
  id: string;
  customer_id: string;
  channel: ConsentChannel;
  agreed: boolean;
  recorded_at: string;
};

/**
 * 동의 이력 1건(타임라인 항목) — GET .../history 응답.
 * 백엔드 service.getRecords 반환형(ConsentRecord) 정합: { channel, agreed, recordedAt }.
 */
export type ConsentHistoryRecord = {
  channel: ConsentChannel;
  agreed: boolean;
  recordedAt: string; // ISO
};

/** 동의 이력 타임라인 응답 — { records } (적재 순, 시점 포함 전체). */
export type ConsentHistory = {
  records: ConsentHistoryRecord[];
};

/** 고객 동의 상태 조회(채널별 현재 동의 + 재확인 필요). */
export async function getConsentStatus(
  customerId: string
): Promise<ConsentStatus> {
  return apiFetch<ConsentStatus>(
    `/admin/consents/customers/${encodeURIComponent(customerId)}`
  );
}

/** 고객 동의/철회 전체 이력 조회(시각 타임라인, append-only 누적). */
export async function getConsentHistory(
  customerId: string
): Promise<ConsentHistory> {
  return apiFetch<ConsentHistory>(
    `/admin/consents/customers/${encodeURIComponent(customerId)}/history`
  );
}

/** 동의/철회 1행 기록(append-only). agreed=true 동의, false 철회. */
export async function recordConsent(
  customerId: string,
  channel: ConsentChannel,
  agreed: boolean
): Promise<{ consent: ConsentLogRow }> {
  return apiFetch(`/admin/consents/customers/${encodeURIComponent(customerId)}`, {
    method: "POST",
    body: JSON.stringify({ channel, agreed }),
  });
}

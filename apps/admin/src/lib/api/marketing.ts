/**
 * 마케팅 — Medusa 캠페인(promotion-campaign) 호출/래핑(로직 복사 X).
 *  - 캠페인 = 프로모션을 묶는 예산·기간 단위. 목록/생성/삭제.
 *  - 예산: usage(사용 횟수 한도) | spend(금액 한도 + 통화).
 *  - 알림톡·SMS·푸시 등 한국형 마케팅 채널은 커스텀 모듈(후속, GAP_B 배지 유지).
 */
import { apiFetch } from "./client";

export type CampaignBudget = {
  type: "usage" | "spend";
  limit: number | null;
  used?: number | null;
  currency_code?: string | null;
};
export type Campaign = {
  id: string;
  name: string;
  campaign_identifier: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  budget: CampaignBudget | null;
  promotions?: { id: string }[];
};

const FIELDS =
  "id,name,campaign_identifier,description,starts_at,ends_at," +
  "budget.type,budget.limit,budget.used,budget.currency_code,promotions.id";

export async function listCampaigns(): Promise<{ campaigns: Campaign[]; count: number }> {
  return apiFetch(`/admin/campaigns?limit=100&order=-created_at&fields=${FIELDS}`);
}

export type CreateCampaignInput = {
  name: string;
  campaign_identifier: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  budget: { type: "usage" | "spend"; limit: number; currency_code?: string };
};

export function createCampaign(input: CreateCampaignInput): Promise<{ campaign: Campaign }> {
  return apiFetch(`/admin/campaigns`, { method: "POST", body: JSON.stringify(input) });
}

export function deleteCampaign(id: string): Promise<unknown> {
  return apiFetch(`/admin/campaigns/${id}`, { method: "DELETE" });
}

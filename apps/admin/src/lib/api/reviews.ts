/**
 * 리뷰·문의 — 우리 custom 모듈(/admin/reviews) 호출. Medusa 코어 없음(GAP_B).
 *  - 목록(type/status 필터) + 단건 + 상태 변경(공개/숨김/대기) + 운영자 답변.
 */
import { apiFetch } from "./client";

export type ReviewType = "review" | "inquiry";
export type ReviewStatus = "pending" | "published" | "hidden" | "answered";

export type ReviewItem = {
  id: string;
  type: ReviewType;
  product_id: string | null;
  product_title: string | null;
  author_name: string | null;
  author_email: string | null;
  rating: number | null;
  title: string | null;
  content: string;
  status: ReviewStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export function listReviews(params: { type?: ReviewType; status?: ReviewStatus; limit?: number; offset?: number } = {}): Promise<{ reviews: ReviewItem[]; count: number }> {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/reviews?${qs.toString()}`);
}

export function getReview(id: string): Promise<{ review: ReviewItem }> {
  return apiFetch(`/admin/reviews/${id}`);
}

export function setReviewStatus(id: string, status: ReviewStatus): Promise<{ review: ReviewItem }> {
  return apiFetch(`/admin/reviews/${id}`, { method: "POST", body: JSON.stringify({ status }) });
}

export function replyReview(id: string, reply: string): Promise<{ review: ReviewItem }> {
  return apiFetch(`/admin/reviews/${id}`, { method: "POST", body: JSON.stringify({ reply }) });
}

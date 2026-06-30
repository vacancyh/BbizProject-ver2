/**
 * 고객센터 콘텐츠(공지/FAQ) Admin API 래퍼 — 백엔드 cms 모듈 호출.
 *  - GET    /admin/notices            목록
 *  - POST   /admin/notices            생성  { title, body, pinned?, status? }
 *  - POST   /admin/notices/:id        수정  (부분)
 *  - DELETE /admin/notices/:id        삭제
 *  - GET/POST/DELETE /admin/faqs(/:id) FAQ (category, question, answer, sort_order?, status?)
 */
import { apiFetch } from "./client";

export type NoticeStatus = "draft" | "published";
export type Notice = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
};

export const FAQ_CATEGORIES = [
  "주문/결제",
  "배송",
  "교환/반품",
  "회원/적립금",
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
export type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
};

// ─────────────── 공지 ───────────────

export async function listNotices(): Promise<Notice[]> {
  const { notices } = await apiFetch<{ notices: Notice[] }>("/admin/notices");
  return notices;
}

export async function createNotice(input: {
  title: string;
  body: string;
  pinned?: boolean;
  status?: NoticeStatus;
}): Promise<Notice> {
  const { notice } = await apiFetch<{ notice: Notice }>("/admin/notices", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return notice;
}

export async function updateNotice(
  id: string,
  input: Partial<{
    title: string;
    body: string;
    pinned: boolean;
    status: NoticeStatus;
  }>
): Promise<Notice> {
  const { notice } = await apiFetch<{ notice: Notice }>(
    `/admin/notices/${id}`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return notice;
}

export async function deleteNotice(id: string): Promise<void> {
  await apiFetch(`/admin/notices/${id}`, { method: "DELETE" });
}

// ─────────────── FAQ ───────────────

export async function listFaqs(): Promise<Faq[]> {
  const { faqs } = await apiFetch<{ faqs: Faq[] }>("/admin/faqs");
  return faqs;
}

export async function createFaq(input: {
  category: string;
  question: string;
  answer: string;
  sort_order?: number;
  status?: NoticeStatus;
}): Promise<Faq> {
  const { faq } = await apiFetch<{ faq: Faq }>("/admin/faqs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return faq;
}

export async function updateFaq(
  id: string,
  input: Partial<{
    category: string;
    question: string;
    answer: string;
    sort_order: number;
    status: NoticeStatus;
  }>
): Promise<Faq> {
  const { faq } = await apiFetch<{ faq: Faq }>(`/admin/faqs/${id}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return faq;
}

export async function deleteFaq(id: string): Promise<void> {
  await apiFetch(`/admin/faqs/${id}`, { method: "DELETE" });
}

// ─────────────── 배너/팝업 ───────────────

export type BannerKind = "hero" | "popup";
export type Banner = {
  id: string;
  kind: BannerKind;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  status: NoticeStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listBanners(): Promise<Banner[]> {
  const { banners } = await apiFetch<{ banners: Banner[] }>("/admin/banners");
  return banners;
}

export async function createBanner(input: {
  kind: BannerKind;
  title: string;
  image_url: string;
  link_url?: string | null;
  sort_order?: number;
  status?: NoticeStatus;
}): Promise<Banner> {
  const { banner } = await apiFetch<{ banner: Banner }>("/admin/banners", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return banner;
}

export async function updateBanner(
  id: string,
  input: Partial<{
    kind: BannerKind;
    title: string;
    image_url: string;
    link_url: string | null;
    sort_order: number;
    status: NoticeStatus;
  }>
): Promise<Banner> {
  const { banner } = await apiFetch<{ banner: Banner }>(
    `/admin/banners/${id}`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return banner;
}

export async function deleteBanner(id: string): Promise<void> {
  await apiFetch(`/admin/banners/${id}`, { method: "DELETE" });
}

// ─────────────── 홈 큐레이션(MD 추천) ───────────────

export type HomeCuration = {
  id: string;
  product_id: string;
  sort_order: number;
  status: NoticeStatus;
  created_at: string;
  updated_at: string;
};

export async function listHomeCurations(): Promise<HomeCuration[]> {
  const { curations } = await apiFetch<{ curations: HomeCuration[] }>(
    "/admin/home-curations"
  );
  return curations;
}

export async function addHomeCuration(input: {
  product_id: string;
  sort_order?: number;
}): Promise<HomeCuration> {
  const { curation } = await apiFetch<{ curation: HomeCuration }>(
    "/admin/home-curations",
    { method: "POST", body: JSON.stringify(input) }
  );
  return curation;
}

export async function deleteHomeCuration(id: string): Promise<void> {
  await apiFetch(`/admin/home-curations/${id}`, { method: "DELETE" });
}

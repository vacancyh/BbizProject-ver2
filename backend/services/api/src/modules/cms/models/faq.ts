/**
 * 자주 묻는 질문(Faq) 모델 — 고객센터 FAQ.
 *
 * 카테고리별 Q&A. 관리자에서 등록/수정/삭제, 스토어프론트는 게시본만 노출.
 * sort_order 오름차순 + 생성순으로 정렬.
 */
import { model } from "@medusajs/framework/utils"

export const FAQ_CATEGORIES = [
  "주문/결제",
  "배송",
  "교환/반품",
  "회원/적립금",
] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]

const Faq = model.define("faq", {
  // 고유 id (prefix = faq)
  id: model.id({ prefix: "faq" }).primaryKey(),
  // 분류 (주문/결제, 배송, 교환/반품, 회원/적립금)
  category: model.text().translatable(),
  // 질문
  question: model.text().translatable(),
  // 답변
  answer: model.text().translatable(),
  // 정렬 순서 (오름차순)
  sort_order: model.number().default(0),
  // 게시 상태 (draft/published)
  status: model.text().default("published"),
})

export default Faq

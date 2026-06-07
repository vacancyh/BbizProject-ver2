/**
 * 리뷰·문의(Review) 모델 — 상품 리뷰 + 고객 문의 통합(GAP_B, Medusa 코어 없음).
 *  - type: "review"(별점 리뷰) | "inquiry"(상품 문의)
 *  - status: pending(대기) | published(공개) | hidden(숨김) | answered(답변완료, 문의)
 *  - 운영자 답변(reply) 1건. PII(이메일)는 저장 시 마스킹.
 */
import { model } from "@medusajs/framework/utils"

const Review = model.define("review", {
  id: model.id({ prefix: "rev" }).primaryKey(),
  // "review" | "inquiry"
  type: model.text().index("IDX_review_type"),
  // 대상 상품(Medusa product.id) + 표시용 상품명(비정규화)
  product_id: model.text().index("IDX_review_product_id").nullable(),
  product_title: model.text().nullable(),
  // 작성자(이메일은 마스킹 저장)
  author_name: model.text().nullable(),
  author_email: model.text().nullable(),
  // 별점(리뷰 1~5, 문의는 null)
  rating: model.number().nullable(),
  title: model.text().nullable(),
  content: model.text(),
  // pending | published | hidden | answered
  status: model.text().index("IDX_review_status"),
  // 운영자 답변
  reply: model.text().nullable(),
  replied_at: model.dateTime().nullable(),
})

export default Review

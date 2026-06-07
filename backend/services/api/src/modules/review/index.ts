/**
 * 리뷰·문의 모듈 — 상품 리뷰 + 고객 문의(GAP_B, Medusa 코어 없음).
 * 운영자: 공개/숨김 조정 + 답변. 작성은 스토어프론트(후속) 또는 시드.
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블(review)만 사용.
 */
import { Module } from "@medusajs/framework/utils"
import ReviewModuleService from "./service"

export const REVIEW_MODULE = "review"

export default Module(REVIEW_MODULE, {
  service: ReviewModuleService,
})

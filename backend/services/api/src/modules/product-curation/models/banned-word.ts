/**
 * 금칙어(BannedWord) 모델
 *
 * 상품명·검색어·리뷰 등에서 차단할 금칙어를 관리한다.
 *  - word: 금칙어 원문 (유니크, 소문자 정규화 권장)
 *  - scope: 적용 범위 ("all" | "search" | "product_name" | "review")
 *  - created_by: 등록한 운영자 admin user_id
 *
 * 노출 기준:
 *  - scope = "all"          → 모든 영역 차단
 *  - scope = "search"       → 검색어만 차단
 *  - scope = "product_name" → 상품명 등록 시 차단
 *  - scope = "review"       → 리뷰 작성 시 차단
 * TODO(사장님결정): scope 종류 확정 후 코드 업데이트.
 */
import { model } from "@medusajs/framework/utils"

const BannedWord = model.define("banned_word", {
  // 레코드 고유 id (prefix = bwd)
  id: model.id({ prefix: "bwd" }).primaryKey(),
  // 금칙어 원문 (유니크)
  word: model.text().index("IDX_banned_word_word"),
  // 적용 범위 (기본 = "all")
  scope: model.text().default("all"),
  // 등록한 운영자 admin user_id (null = 시스템 등록)
  created_by: model.text().nullable(),
})

export default BannedWord

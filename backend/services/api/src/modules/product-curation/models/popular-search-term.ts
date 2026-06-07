/**
 * 인기 검색어(PopularSearchTerm) 모델
 *
 * 검색어별 집계 데이터를 관리한다.
 *  - term: 검색어 (유니크)
 *  - count: 누적 검색 횟수
 *  - last_searched_at: 마지막 검색 일시
 *  - is_banned: 금칙어 여부 (true = 검색/노출 차단)
 *
 * 금칙어 필터:
 *  - is_banned = true 인 검색어는 인기검색어 노출 차단.
 *  - 별도 BannedWord 모델과 달리, 검색어 자체에 플래그를 두어 관리 단순화.
 * TODO(사장님결정): 금칙어 관리를 별도 BannedWord 테이블로 분리할지, 플래그로 유지할지 결정.
 */
import { model } from "@medusajs/framework/utils"

const PopularSearchTerm = model.define("popular_search_term", {
  // 레코드 고유 id (prefix = pst)
  id: model.id({ prefix: "pst" }).primaryKey(),
  // 검색어 (1자 이상, 유니크)
  term: model.text().index("IDX_popular_search_term_term"),
  // 누적 검색 횟수
  count: model.number().default(0),
  // 마지막 검색 일시
  last_searched_at: model.dateTime().nullable(),
  // 금칙어 여부 (true = 인기검색어 노출 차단)
  is_banned: model.boolean().default(false),
})

export default PopularSearchTerm

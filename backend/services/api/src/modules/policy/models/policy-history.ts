/**
 * 정책 변경이력(PolicyHistory) 모델 — append-only.
 *
 * 출처: 관리자_설계.md §5.3 (변경이력 SUPER 전용 열람)
 *  - 정책 변경 1건마다 before/after + 행위자 기록
 *  - service.set 에서만 생성(수정/삭제 미노출)
 */
import { model } from "@medusajs/framework/utils"

const PolicyHistory = model.define("policy_history", {
  // 이력 고유 id (prefix = polh)
  id: model.id({ prefix: "polh" }).primaryKey(),
  // 대상 정책 키
  policy_key: model.text().index("IDX_policy_history_policy_key"),
  // 변경 전 값(json, 최초 변경 시 null)
  before: model.json().nullable(),
  // 변경 후 값(json)
  after: model.json(),
  // 행위자 user.id
  actor_id: model.text().nullable(),
  // 행위자 이메일
  actor_email: model.text().nullable(),
})

export default PolicyHistory

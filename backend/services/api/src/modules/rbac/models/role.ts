/**
 * RBAC 등급(Role) 모델
 *
 * 출처: 관리자_설계.md §5.1 / 쇼핑몰_전용_QA_v4.md ADM-R
 *  - SUPER     = 최고관리자 (전체 권한, 변경 불가)
 *  - OPERATION = 운영 (주문·상품·카테고리·회원·배송·리뷰 운영)
 *  - CS        = 고객지원 (주문/회원 조회·일부 수정 + 리뷰·문의 처리)
 *  - MARKETER  = 마케터 (쿠폰·프로모션·마케팅·통계)
 *
 * Medusa core(user) 는 수정하지 않고 user_id 를 text 로 보관(RbacUserRole)하여 등급을 매핑한다.
 */
import { model } from "@medusajs/framework/utils"

// 등급 키 (DB 값 + 외부 노출 고정 집합)
export const ROLE_KEYS = ["super", "operation", "cs", "marketer"] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

const Role = model.define("rbac_role", {
  // 등급 고유 id (prefix = role)
  id: model.id({ prefix: "role" }).primaryKey(),
  // 등급 키 (super/operation/cs/marketer, 유일)
  key: model.text().unique(),
  // 한글 표시명
  name: model.text(),
  // 설명
  description: model.text().nullable(),
  // 시스템 기본 등급 여부(삭제 금지 표시)
  is_system: model.boolean().default(true),
})

export default Role

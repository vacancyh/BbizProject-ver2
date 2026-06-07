/**
 * 점검모드 상태 모델 (maintenance_state 테이블)
 *
 * scope 별로 1행씩 보관 (all/storefront/admin).
 * ops 서비스가 upsert 방식으로 관리한다.
 */
import { model } from "@medusajs/framework/utils"

const MaintenanceState = model.define("maintenance_state", {
  id: model.id({ prefix: "maint" }).primaryKey(),
  /** 점검 범위: all | storefront | admin */
  scope: model.text(),
  /** 활성 여부 */
  enabled: model.boolean().default(false),
  /** 사용자 안내 메시지 (선택, 최대 200자) */
  message: model.text().nullable(),
})

export default MaintenanceState

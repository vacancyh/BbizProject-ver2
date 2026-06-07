/**
 * ops 모듈 — 점검모드·헬스 (t009 갭B 커스텀)
 *
 * Medusa core 無. 점검모드(scope: all/storefront/admin) ON/OFF 관리 +
 * 핵심 인프라(DB/Redis) 헬스 polling 응답.
 *
 * 보안: 점검모드 전환 = SUPER 전용 (canToggleMaintenance — t010 rbac 정합).
 * 감사: 점검모드 변경 이력은 t011(audit) 에서 기록.
 */
import { Module } from "@medusajs/framework/utils"
import OpsModuleService from "./service"

export const OPS_MODULE = "ops"

export default Module(OPS_MODULE, {
  service: OpsModuleService,
})

/**
 * ops 모듈 서비스 — 점검모드·헬스.
 *
 * 주요 메서드:
 *  - toggleMaintenance(scope, enabled, message?, roleKey)
 *      canToggleMaintenance(roleKey) 판정 → false 이면 throw(403).
 *      scope/message 검증 → DB upsert.
 *  - getMaintenanceState(scope?)
 *      전체 또는 scope별 점검모드 상태 조회.
 *  - checkHealth(dbFn, redisFn)
 *      dbFn/redisFn (injected probe) 실행 → resolveHealthStatus 판정.
 *
 * logic.ts 위임:
 *  - isValidScope, isValidMaintenanceMessage → 입력 검증
 *  - resolveHealthStatus → 헬스 판정
 *  - canToggleMaintenance → 권한 판정 (SUPER 정합)
 */
import { MedusaService } from "@medusajs/framework/utils"
import MaintenanceState from "./models/maintenance-state"
import {
  isValidScope,
  isValidMaintenanceMessage,
  resolveHealthStatus,
  canToggleMaintenance,
  type MaintenanceScope,
  type HealthStatus,
} from "./logic"

class OpsModuleService extends MedusaService({
  MaintenanceState,
}) {
  /**
   * 점검모드 전환.
   *
   * canToggleMaintenance(roleKey) = false 이면 에러(403 게이트용).
   * scope/message 검증 후 DB upsert.
   *
   * @param scope    점검 범위 (all | storefront | admin)
   * @param enabled  활성화 여부
   * @param message  안내 메시지 (선택)
   * @param roleKey  요청 관리자의 등급 키 (null = 미할당)
   */
  async toggleMaintenance(
    scope: string,
    enabled: boolean,
    message: string | undefined,
    roleKey: string | null
  ): Promise<any> {
    // canToggleMaintenance: SUPER 권한 판정 (production 실행경로)
    if (!canToggleMaintenance(roleKey)) {
      throw new Error("[ops] 점검모드 전환은 최고관리자(SUPER) 전용입니다.")
    }
    // isValidScope: scope 유효성 검증 (production 실행경로)
    if (!isValidScope(scope)) {
      throw new Error(`[ops] scope 오류: "${scope}" 는 허용되지 않습니다. (all/storefront/admin)`)
    }
    // isValidMaintenanceMessage: 메시지 길이 검증 (production 실행경로)
    if (!isValidMaintenanceMessage(message)) {
      throw new Error("[ops] 안내 메시지는 200자 이내여야 합니다.")
    }

    const existing = await this.listMaintenanceStates({ scope })
    if (existing.length) {
      const [updated] = await this.updateMaintenanceStates([
        {
          id: existing[0].id,
          enabled,
          message: message ?? null,
        },
      ])
      return updated
    }
    const [created] = await this.createMaintenanceStates([
      {
        scope: scope as MaintenanceScope,
        enabled,
        message: message ?? null,
      },
    ])
    return created
  }

  /**
   * 점검모드 상태 조회.
   *
   * @param scope 조회할 scope (미지정이면 전체)
   */
  async getMaintenanceState(scope?: string): Promise<any[]> {
    if (scope) {
      return this.listMaintenanceStates({ scope })
    }
    return this.listMaintenanceStates({})
  }

  /**
   * 인프라 헬스 확인.
   *
   * dbFn / redisFn = probe 콜백 (route 에서 주입, 테스트에서 교체 가능).
   * resolveHealthStatus(logic.ts) 로 최종 상태 판정.
   *
   * @param dbFn    DB 접속 probe (성공=true, 실패=false 반환 또는 throw)
   * @param redisFn Redis 접속 probe
   * @returns HealthStatus (db, redis, overall, httpCode)
   */
  async checkHealth(
    dbFn: () => Promise<boolean>,
    redisFn: () => Promise<boolean>
  ): Promise<HealthStatus> {
    const [dbOk, redisOk] = await Promise.all([
      dbFn().catch(() => false),
      redisFn().catch(() => false),
    ])
    // resolveHealthStatus: 헬스 판정 (production 실행경로)
    return resolveHealthStatus(dbOk, redisOk)
  }
}

export default OpsModuleService

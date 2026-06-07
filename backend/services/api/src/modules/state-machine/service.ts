import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import StateMachineConfig from "./models/state-machine-config"
import StateHistory from "./models/state-history"

/**
 * StateMachineModuleService 입니다.
 *
 * 4 도메인 (order / payment / refund / fulfillment) 의 상태 전이 그래프를
 * StateMachineConfig 에서 조회해 전이 가능 여부를 검증하고,
 * 모든 전이를 StateHistory 에 audit log 로 기록합니다.
 *
 * MedusaService 가 자동 생성하는 메서드:
 * - listStateMachineConfigs / retrieveStateMachineConfig / createStateMachineConfigs / updateStateMachineConfigs / deleteStateMachineConfigs
 * - listStateHistories / retrieveStateHistory / createStateHistories / updateStateHistories / deleteStateHistories
 *
 * 본 클래스가 추가로 구현하는 메서드:
 * - getNextStates(domain, currentState): 현재 state 에서 갈 수 있는 next states 배열
 * - validateTransition(domain, from, to): 전이 가능 여부 (불가 시 MedusaError throw)
 * - transition(entityId, domain, from, to, actor, metadata?): 검증 후 history 기록
 * - getHistory(entityId, domain): 특정 entity 의 전이 히스토리 조회
 */
class StateMachineModuleService extends MedusaService({
  StateMachineConfig,
  StateHistory,
}) {
  /**
   * 도메인의 config 를 조회합니다.
   * 없으면 MedusaError 를 던집니다.
   */
  private async getDomainConfig(domain: string): Promise<{
    id: string
    domain: string
    states: string[]
    transitions: Record<string, string[]>
  }> {
    const configs = await this.listStateMachineConfigs({ domain })
    if (!configs || configs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `state-machine config 가 등록되지 않은 도메인입니다: ${domain}`
      )
    }
    const config = configs[0] as unknown as {
      id: string
      domain: string
      states: string[]
      transitions: Record<string, string[]>
    }
    return config
  }

  /**
   * 현재 state 에서 전이 가능한 next state 목록을 반환합니다.
   * 현재 state 가 그래프에 등록되지 않은 경우 빈 배열을 반환합니다.
   */
  async getNextStates(domain: string, currentState: string): Promise<string[]> {
    const config = await this.getDomainConfig(domain)
    const next = config.transitions[currentState]
    return Array.isArray(next) ? [...next] : []
  }

  /**
   * 주어진 전이가 합법인지 검증합니다.
   * 잘못된 전이일 경우 MedusaError 를 throw 합니다.
   * 성공 시 true 를 반환합니다.
   */
  async validateTransition(
    domain: string,
    fromState: string,
    toState: string
  ): Promise<boolean> {
    const config = await this.getDomainConfig(domain)

    // 1. from / to 가 도메인에 정의된 state 인지 확인
    if (!config.states.includes(fromState)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[state-machine:${domain}] 알 수 없는 from_state 입니다: ${fromState}`
      )
    }
    if (!config.states.includes(toState)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[state-machine:${domain}] 알 수 없는 to_state 입니다: ${toState}`
      )
    }

    // 2. 전이 그래프에서 fromState → toState 가 허용되는지 확인
    const allowed = config.transitions[fromState] ?? []
    if (!allowed.includes(toState)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `[state-machine:${domain}] 허용되지 않은 전이입니다: ${fromState} -> ${toState}`
      )
    }

    return true
  }

  /**
   * 실제 전이를 수행합니다.
   * - 1단계: validateTransition 으로 검증
   * - 2단계: StateHistory 에 audit log 기록
   *
   * 메두사 core entity 의 status 컬럼 update 는 본 메서드 범위가 아닙니다 (P2 workflow 단계에서 처리).
   */
  async transition(
    entityId: string,
    domain: string,
    fromState: string,
    toState: string,
    actor: string,
    metadata?: Record<string, unknown> | null
  ): Promise<any> {
    // 검증 (실패 시 throw)
    await this.validateTransition(domain, fromState, toState)

    // history 기록
    const created = await this.createStateHistories({
      entity_id: entityId,
      domain,
      from_state: fromState,
      to_state: toState,
      actor,
      metadata: metadata ?? null,
    })

    // createStateHistories 는 단일 입력 시 단일 객체를 반환합니다.
    return created
  }

  /**
   * 특정 entity 의 전이 히스토리를 시간순으로 조회합니다.
   */
  async getHistory(entityId: string, domain: string): Promise<any[]> {
    const list = await this.listStateHistories(
      { entity_id: entityId, domain },
      { order: { created_at: "ASC" } }
    )
    return list as unknown as any[]
  }
}

export default StateMachineModuleService

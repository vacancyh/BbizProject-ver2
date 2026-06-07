import { model } from "@medusajs/framework/utils"

/**
 * StateMachineConfig 데이터 모델입니다.
 *
 * 도메인별 (order / payment / refund / fulfillment) 상태 그래프 정의를 저장합니다.
 * - states: 해당 도메인에서 허용되는 모든 state 문자열 배열 (JSON 으로 저장)
 * - transitions: 전이 그래프 매핑 ({ [fromState]: string[] }) (JSON 으로 저장)
 *
 * 본 모델은 P1 단계에서는 seed 스크립트로 4개 row 만 초기화하며,
 * P3 admin UI 에서 런타임 override 진입점으로 사용합니다.
 */
export const StateMachineConfig = model.define("state_machine_config", {
  id: model.id().primaryKey(),
  domain: model.text().unique(),
  states: model.json(),
  transitions: model.json(),
})

export default StateMachineConfig

import { Module } from "@medusajs/framework/utils"
import StateMachineModuleService from "./service"

/**
 * state-machine module 정의입니다.
 *
 * 벤듀어 FSM<T> 와 동등한 제네릭 상태머신을 메두사 v2 module 로 이식한 것입니다.
 * 4 도메인 (order / payment / refund / fulfillment) 의 전이 그래프를 단일 출처로 관리하며,
 * 모든 전이를 StateHistory 테이블에 audit log 로 기록합니다.
 */
export const STATE_MACHINE_MODULE = "stateMachine"

export default Module(STATE_MACHINE_MODULE, {
  service: StateMachineModuleService,
})

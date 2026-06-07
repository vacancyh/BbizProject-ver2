/**
 * 주문 상태 전이 이력 Admin API
 *
 *  - GET /admin/orders/:id/history
 *      state-machine 모듈의 getHistory(orderId, "order") 를 호출하여
 *      해당 주문의 상태 전이 이력을 오름차순으로 반환합니다.
 *      이력이 없거나 조회 실패 시 200 + state_history: [] 반환 (404 아님).
 *
 * spec: dag/d2_주문관리/t002_주문상세.md §5 A2, §6 API2
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATE_MACHINE_MODULE } from "../../../../../modules/state-machine"
import StateMachineModuleService from "../../../../../modules/state-machine/service"
import { serializeStateHistory } from "./order-history-logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id

  let rows: any[] = []
  try {
    const stateMachine = req.scope.resolve(STATE_MACHINE_MODULE) as unknown as StateMachineModuleService
    rows = await stateMachine.getHistory(orderId, "order")
  } catch {
    // getHistory 실패(도메인 미등록 등) 시 빈 이력 반환 — 이력 없음은 정상 상태
    rows = []
  }

  res.json({ state_history: serializeStateHistory(rows) })
}

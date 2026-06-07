/**
 * 주문 운영(한국형) 모듈 정의 — 관리자 메모 + 강제취소 사유 보관(GAP_B).
 *
 * Medusa core(order)는 수정하지 않고 order_id(text)로 느슨 연결.
 * 강제취소/출고 등은 엔드포인트에서 Medusa core-flows 워크플로우를 호출/래핑한다.
 */
import { Module } from "@medusajs/framework/utils"
import OrderOpsKrModuleService from "./service"

export const ORDER_OPS_KR_MODULE = "orderOpsKr"

export default Module(ORDER_OPS_KR_MODULE, {
  service: OrderOpsKrModuleService,
})

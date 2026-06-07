/**
 * 교환 그룹(order-exchange-group) 모듈 정의.
 *
 * 다건 교환을 1개 그룹으로 묶어 1회 회수 운송장 + 차액 합산 처리 지원.
 * spec: t005_교환.md §7 D11(exchange_group). Medusa core 미수정, order_id 느슨 연결.
 */
import { Module } from "@medusajs/framework/utils"
import OrderExchangeGroupModuleService from "./service"

export const ORDER_EXCHANGE_GROUP_MODULE = "orderExchangeGroup"

export default Module(ORDER_EXCHANGE_GROUP_MODULE, {
  service: OrderExchangeGroupModuleService,
})

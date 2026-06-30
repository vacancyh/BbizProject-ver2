/**
 * 재입고 알림 모듈 — 품절 상품 재입고 시 고객 알림(GAP, Medusa core 없음).
 * 가드레일: Medusa core 미수정. 전용 테이블(restock_subscription)만 사용.
 */
import { Module } from "@medusajs/framework/utils"
import RestockNotificationModuleService from "./service"

export const RESTOCK_NOTIFICATION_MODULE = "restockNotification"

export default Module(RESTOCK_NOTIFICATION_MODULE, {
  service: RestockNotificationModuleService,
})

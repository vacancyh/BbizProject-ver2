import { Module } from "@medusajs/framework/utils"
import RmaExtensionModuleService from "./service"

/**
 * RMA Extension Module
 * ----------------------------------------------------------------------------
 * 메두사 v2.15.3 의 RMA (Return / Claim / Exchange) 기능에 한국 비즈니스
 * 메타데이터 (반품 정책 · 환불 타입 · 검수 · 배송비 부담) 를 추가합니다.
 *
 * 메두사 core entity 는 수정하지 않고 `defineLink` 로만 연결합니다.
 * (참조: `apps/backend/apps/backend/src/links/order-return-rma.ts`)
 */
export const RMA_EXTENSION_MODULE = "rmaExtension"

export default Module(RMA_EXTENSION_MODULE, {
  service: RmaExtensionModuleService,
})

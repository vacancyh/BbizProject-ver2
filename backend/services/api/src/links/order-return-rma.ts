import OrderModule from "@medusajs/medusa/order"
import RmaExtensionModule from "../modules/rma-extension"
import { defineLink } from "@medusajs/framework/utils"

/**
 * 메두사 order_return ↔ RMA Extension 링크 정의
 * ----------------------------------------------------------------------------
 * 메두사 core entity (`order_return`) 를 수정하지 않고
 * `defineLink` 로만 확장 모델과 연결합니다.
 *
 * 1) order_return.id ↔ rmaExtension.ReimbursementMethod.order_return_id (1:1)
 * 2) order_return.id ↔ rmaExtension.ReturnInspection.order_return_id  (1:N)
 *
 * 본 파일은 메두사가 자동 로드합니다 (`src/links/` 디렉토리 컨벤션).
 */

// 1) Return ↔ ReimbursementMethod (1:1)
export const orderReturnReimbursementLink = defineLink(
  OrderModule.linkable.return,
  RmaExtensionModule.linkable.reimbursementMethod
)

// 2) Return ↔ ReturnInspection (1:N — 반품 1 건에 여러 품목 검수 가능)
export const orderReturnInspectionLink = defineLink(
  OrderModule.linkable.return,
  {
    linkable: RmaExtensionModule.linkable.returnInspection,
    isList: true,
  }
)

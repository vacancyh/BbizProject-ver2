/**
 * 메두사 order ↔ withdrawal7Day 모듈 데이터 모델 link 정의
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 / §18
 *
 * 정의 link:
 *  1. order.id ↔ WithdrawalEligibility.order_id   (1:1)
 *  2. order.id ↔ WithdrawalReasonRecord.order_id  (1:N, 한 주문이 여러 청약철회 신청 이력을 가질 수 있음)
 *
 * 메두사 module isolation 원칙 (메두사_..._module-links_link_page.mdx) 준수 = core entity 무수정.
 * 본 link 는 src/links 디렉터리에 배치되어야 합니다 (메두사_..._extend-features_define-link_page.mdx).
 */
import OrderModule from "@medusajs/medusa/order"
import { defineLink } from "@medusajs/framework/utils"
import WithdrawalSevenDayModule from "../modules/legal-kr/withdrawal-7day"

// 1:1 link — 한 주문 = 한 청약철회 가능 여부 레코드
export const orderWithdrawalEligibilityLink = defineLink(
  OrderModule.linkable.order,
  WithdrawalSevenDayModule.linkable.withdrawalEligibility
)

// 1:N link — 한 주문 = 여러 청약철회 신청 이력 가능
export const orderWithdrawalReasonRecordLink = defineLink(
  OrderModule.linkable.order,
  {
    linkable: WithdrawalSevenDayModule.linkable.withdrawalReasonRecord,
    isList: true,
  }
)

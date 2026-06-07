import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import {
  ReturnsPolicy,
} from "./models/returns-policy"
import {
  ReimbursementMethod,
  ReimbursementTypeValue,
} from "./models/reimbursement-type"
import { ReturnInspection } from "./models/return-inspection"
import {
  ReturnShippingFeePolicy,
  ReturnReasonValue,
  ShippingFeePayerValue,
} from "./models/return-shipping-fee-policy"

/**
 * RmaExtensionModuleService
 * ----------------------------------------------------------------------------
 * 메두사 RMA 확장 모듈의 핵심 서비스 클래스입니다.
 *
 * 4 개 모델 (`ReturnsPolicy` / `ReimbursementMethod` / `ReturnInspection` /
 * `ReturnShippingFeePolicy`) 의 CRUD 메서드는 `MedusaService` 팩토리가
 * 자동 생성합니다 (예: `createReturnsPolicies` · `listReturnsPolicies` 등).
 *
 * 본 클래스는 그 위에 비즈니스 로직 메서드 4 종을 추가합니다.
 */
class RmaExtensionModuleService extends MedusaService({
  ReturnsPolicy,
  ReimbursementMethod,
  ReturnInspection,
  ReturnShippingFeePolicy,
}) {
  /**
   * 스토어 단위 활성 반품 정책을 조회합니다.
   *
   * - `active = true` 인 정책 중 최신 1 건을 반환합니다.
   * - 정책이 없으면 `NOT_FOUND` 에러를 던집니다.
   */
  async getReturnsPolicy(storeId: string): Promise<any> {
    const policies = await this.listReturnsPolicies(
      { store_id: storeId, active: true },
      { take: 1, order: { created_at: "DESC" } }
    )

    if (!policies || policies.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `스토어 ${storeId} 의 활성 반품 정책을 찾을 수 없습니다.`
      )
    }

    return policies[0]
  }

  /**
   * 환불 금액을 계산합니다.
   *
   * - 현재 P1 단계에서는 `order_return_id` 에 연결된 가장 최근
   *   `ReimbursementMethod` 레코드의 `amount` 를 그대로 반환합니다.
   * - 레코드가 없으면 type 별 기본 (`amount = 0`, `status = PENDING`) 으로
   *   계산 결과만 반환합니다 (DB 저장은 별도 워크플로우 단계 책임).
   * - P2 에서 배송비 차감 / 적립금 환산 로직이 본 메서드로 통합됩니다.
   */
  async calculateReimbursement(
    orderReturnId: string,
    type: ReimbursementTypeValue
  ): Promise<{ amount: number; method: any }> {
    const methods = await this.listReimbursementMethods(
      { order_return_id: orderReturnId, type },
      { take: 1, order: { created_at: "DESC" } }
    )

    if (methods && methods.length > 0) {
      const method = methods[0]
      // bigNumber 는 라이브러리 종류에 따라 string · number 모두 가능
      const amount = Number(method.amount ?? 0)
      return { amount, method }
    }

    // 미존재 시 계산 결과만 반환 (저장 X = Rule One 준수)
    return {
      amount: 0,
      method: {
        order_return_id: orderReturnId,
        type,
        amount: 0,
        status: "PENDING",
      },
    }
  }

  /**
   * 반품 1 건의 재판매 가능 여부를 판정합니다.
   *
   * - `order_return_id` 에 연결된 검수 (`ReturnInspection`) 레코드를
   *   조회하여 1 건이라도 `resellable = false` 이면 false 반환합니다.
   * - 검수 미존재 시 false (검수 전 = 재판매 불가) 로 보수적으로 판정합니다.
   */
  async checkResellable(orderReturnId: string): Promise<boolean> {
    const inspections = await this.listReturnInspections({
      order_return_id: orderReturnId,
    })

    if (!inspections || inspections.length === 0) {
      return false
    }

    return inspections.every((insp: any) => insp.resellable === true)
  }

  /**
   * 반품 사유에 따라 배송비 부담 주체와 금액을 산출합니다.
   *
   * - 활성 ReturnsPolicy 1 건에 연결된 `ReturnShippingFeePolicy` 중
   *   동일 `reason` 인 row 를 찾아 반환합니다.
   * - 미설정 시 한국 default 매핑을 적용합니다.
   *   - CUSTOMER_CHANGE_OF_MIND → CUSTOMER
   *   - PRODUCT_DEFECT          → SELLER
   *   - WRONG_DELIVERY          → SELLER
   *   - OTHER                   → CUSTOMER
   */
  async assignShippingFee(
    orderReturnId: string,
    reason: ReturnReasonValue
  ): Promise<{ payer: ShippingFeePayerValue; amount: number | null }> {
    const fees = await this.listReturnShippingFeePolicies(
      { reason },
      { take: 1, order: { created_at: "DESC" } }
    )

    if (fees && fees.length > 0) {
      const fee = fees[0]
      return {
        payer: fee.payer as ShippingFeePayerValue,
        amount: fee.amount === null || fee.amount === undefined
          ? null
          : Number(fee.amount),
      }
    }

    // 한국 default fallback 매핑
    const defaultPayer: Record<ReturnReasonValue, ShippingFeePayerValue> = {
      CUSTOMER_CHANGE_OF_MIND: "CUSTOMER",
      PRODUCT_DEFECT: "SELLER",
      WRONG_DELIVERY: "SELLER",
      OTHER: "CUSTOMER",
    }

    // orderReturnId 는 향후 audit log 용으로 사용 (P2 hook 에서 갱신).
    void orderReturnId

    return {
      payer: defaultPayer[reason],
      amount: null,
    }
  }
}

export default RmaExtensionModuleService

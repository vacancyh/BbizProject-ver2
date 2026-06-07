import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RMA_EXTENSION_MODULE } from "."
import { RETURN_REASONS } from "./models/return-shipping-fee-policy"

/**
 * RMA Extension 모듈 시드 스크립트
 * ----------------------------------------------------------------------------
 * 한국 default 반품 정책 1 건 + 사유별 배송비 정책 4 건을 생성합니다.
 *
 * 실행 방법:
 *   npx medusa exec ./src/modules/rma-extension/seed.ts
 *
 * 한국 default (전자상거래법 §17 / §18):
 * - window_days              = 7 (청약철회 7 일)
 * - restocking_fee_pct       = 0 (재입고 수수료 없음)
 * - shipping_fee_payer 기본  = customer
 * - 사유별 배송비 부담:
 *     CUSTOMER_CHANGE_OF_MIND → CUSTOMER  (단순변심)
 *     PRODUCT_DEFECT          → SELLER    (상품불량)
 *     WRONG_DELIVERY          → SELLER    (오배송)
 *     OTHER                   → CUSTOMER  (기타)
 */
export default async function seedRmaExtension({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const rmaService: any = container.resolve(RMA_EXTENSION_MODULE)

  // 메두사 기본 스토어 id 조회 (스토어 모듈 사용)
  const storeService: any = container.resolve("store")
  const stores = await storeService.listStores({}, { take: 1 })
  if (!stores || stores.length === 0) {
    throw new Error(
      "기본 스토어를 찾을 수 없습니다. 메두사 기본 시드를 먼저 실행하세요."
    )
  }
  const storeId = stores[0].id

  logger.info(`RMA Extension 시드 시작 — store_id=${storeId}`)

  // 1) ReturnsPolicy 1 건
  const [policy] = await rmaService.createReturnsPolicies([
    {
      store_id: storeId,
      name: "한국 표준 7일 청약철회 정책",
      window_days: 7,
      restocking_fee_pct: 0,
      shipping_fee_payer: "customer",
      active: true,
    },
  ])
  logger.info(`ReturnsPolicy 생성 완료: ${policy.id}`)

  // 2) ReturnShippingFeePolicy 4 건 (사유별)
  const feeMap: Record<
    (typeof RETURN_REASONS)[number],
    "CUSTOMER" | "SELLER"
  > = {
    CUSTOMER_CHANGE_OF_MIND: "CUSTOMER",
    PRODUCT_DEFECT: "SELLER",
    WRONG_DELIVERY: "SELLER",
    OTHER: "CUSTOMER",
  }

  const feeRows = RETURN_REASONS.map((reason) => ({
    returns_policy_id: policy.id,
    reason,
    payer: feeMap[reason],
    amount: null,
  }))

  const fees = await rmaService.createReturnShippingFeePolicies(feeRows)
  logger.info(`ReturnShippingFeePolicy ${fees.length} 건 생성 완료`)

  logger.info("RMA Extension 시드 완료")
}

// 타임세일 자동 만료·원가복원 스케줄 작업
//
// 동작:
//  - 5분 간격으로 실행 (cron: every 5 minutes)
//  - DB 에서 status = "active" 인 세일 중
//    (1) ends_at 이 현재 시각보다 과거인 것 → status = "ended" 로 갱신 (시간 만료)
//    (2) stock_quantity = 0 인 것 → status = "ended" 로 갱신 (재고 소진)
//      (재고는 Medusa 코어 product_variant 테이블의 inventory 참조; 직접 쿼리 없이
//       TimeSale.original_price 스냅샷만 복원 - 실제 price 갱신은 Medusa Pricing API 연동 후속)
//
// 원가복원 전략:
//  - 세일 종료 시 original_price 스냅샷이 존재하면 logger.info 로 복원 대상 기록.
//  - 실제 Medusa price_rule / price_set 갱신은 Pricing 모듈 연동 후 구현
//    (현재 독립 모듈이므로 Medusa Pricing 모듈 직접 호출 없이 로그 기록으로 위임).
//  - TODO(사장님결정): Medusa Pricing API 연동 방식 확정 후 아래 restorePricing() 블록 해제.
//
// Medusa scheduled job 명세: medusa.js scheduled-jobs 문서 참조.
// config.schedule: 5분마다 1회 실행.
import { MedusaContainer } from "@medusajs/framework/types"
import { TIME_SALE_MODULE } from ".."
import TimeSaleModuleService from "../service"
import { resolveSaleStatus } from "../logic"

export default async function timeSaleExpiryCheckJob(
  container: MedusaContainer
) {
  const logger = container.resolve("logger")
  const svc = container.resolve<TimeSaleModuleService>(TIME_SALE_MODULE)

  const nowIso = new Date().toISOString()

  try {
    // 현재 active 상태인 세일 전체 조회
    const { items: activeSales } = await svc.listSales({ status: "active" })

    let expiredByTime = 0
    let expiredByStock = 0

    for (const sale of activeSales) {
      // ① 시간 만료 체크: ends_at 이 현재 시각보다 과거
      const resolved = resolveSaleStatus(sale.starts_at, sale.ends_at, nowIso)
      if (resolved === "ended") {
        await svc.endSale(sale.id)
        expiredByTime += 1
        logger.info(
          `[timeSaleExpiry] 시간 만료로 세일 종료. id=${sale.id}, product_id=${sale.product_id}, ends_at=${sale.ends_at}`
        )
        // 원가복원 대상 로깅 (Pricing API 연동 전 기록)
        if (sale.original_price !== null && sale.original_price !== undefined) {
          logger.info(
            `[timeSaleExpiry] 원가복원 대상. product_id=${sale.product_id}, original_price=${sale.original_price}`
            // TODO(사장님결정): Pricing 모듈 연동 방식 확정 후 restorePricing(product_id, original_price) 호출
          )
        }
        continue
      }

      // ② 재고 소진 체크
      // TODO(사장님결정): Medusa Inventory 모듈과 연동하여 재고 0 여부 확인.
      // 현재는 재고 소진 자동 종료를 위한 훅 지점만 마련.
      // 실제 구현 예시:
      //   const inventorySvc = container.resolve(INVENTORY_MODULE)
      //   const [items] = await inventorySvc.listInventoryItems({ sku: sale.product_id })
      //   if (items[0]?.stocked_quantity === 0) { await svc.endSale(sale.id); expiredByStock++ }
    }

    logger.info(
      `[timeSaleExpiry] 만료 점검 완료. 시간만료=${expiredByTime}건, 재고소진=${expiredByStock}건`
    )
  } catch (err) {
    logger.error(
      `[timeSaleExpiry] 만료 점검 실패. error=${(err as Error).message}`
    )
  }
}

// Medusa scheduled job 설정 (5분마다 실행)
export const config = {
  name: "time-sale-expiry-check",
  schedule: "*/5 * * * *",
}

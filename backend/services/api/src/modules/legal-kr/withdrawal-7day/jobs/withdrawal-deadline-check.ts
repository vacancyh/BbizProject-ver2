/**
 * 청약철회 마감일 일일 점검 스케줄 작업
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ① (인도일 + 7 일)
 *
 * 동작:
 *  - 매일 1 회 (자정) 실행
 *  - eligible_until 이 오늘 (24 시간 이내) 안에 만료되는 주문을 조회
 *  - 각 주문에 대해 알림 로그 출력 (실제 알림 전송은 후속 사이클에서 메일·푸시 워크플로우 연결)
 *  - 또한 이미 만료된 주문은 expire 처리 후보로 로깅 (실제 expire 로직 = 후속)
 *
 * 메두사 scheduled job 명세는 메두사_..._scheduled-jobs_page.mdx 참조.
 * cron expression "0 0 * * *" = 매일 자정 1 회.
 */
import { MedusaContainer } from "@medusajs/framework/types"
import { WITHDRAWAL_7DAY_MODULE } from ".."
import WithdrawalSevenDayModuleService from "../service"

export default async function withdrawalDeadlineCheckJob(
  container: MedusaContainer
) {
  const logger = container.resolve("logger")

  const withdrawalService = container.resolve<
    WithdrawalSevenDayModuleService
  >(WITHDRAWAL_7DAY_MODULE)

  const now = new Date()
  // 24 시간 후 마감 시각 = 오늘 안에 만료되는 주문 범위
  const tomorrow = new Date(now.getTime())
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    // 전체 eligibility 레코드 조회 (운영 환경 데이터 규모 커질 시 page/limit 필터 사용 권장)
    const eligibilities = await withdrawalService.listWithdrawalEligibilities({
      is_eligible: true,
    })

    let expiringTodayCount = 0
    let alreadyExpiredCount = 0

    for (const eligibility of eligibilities) {
      const deadline = new Date(
        eligibility.eligible_until as unknown as string
      )

      if (deadline.getTime() <= now.getTime()) {
        // 이미 만료된 주문 = expire 후보
        alreadyExpiredCount += 1
        logger.warn(
          `[withdrawal7Day] 청약철회 기간 만료된 주문. order_id=${eligibility.order_id}, eligible_until=${eligibility.eligible_until}`
        )
        // TODO(후속 사이클): is_eligible = false 로 전환하거나 별도 expired 상태 컬럼 추가
        continue
      }

      if (deadline.getTime() <= tomorrow.getTime()) {
        // 24 시간 내 만료 임박 = 알림 발송 후보
        expiringTodayCount += 1
        logger.info(
          `[withdrawal7Day] 청약철회 마감 임박 (24h 이내). order_id=${eligibility.order_id}, eligible_until=${eligibility.eligible_until}`
        )
        // TODO(후속 사이클): notification workflow 호출 (이메일·SMS·푸시)
      }
    }

    logger.info(
      `[withdrawal7Day] 마감일 점검 완료. 임박=${expiringTodayCount}건, 만료=${alreadyExpiredCount}건`
    )
  } catch (err) {
    logger.error(
      `[withdrawal7Day] 마감일 점검 실패. error=${(err as Error).message}`
    )
  }
}

// scheduled job 설정 (cron expression = 매일 자정)
export const config = {
  name: "withdrawal-deadline-check",
  schedule: "0 0 * * *",
}

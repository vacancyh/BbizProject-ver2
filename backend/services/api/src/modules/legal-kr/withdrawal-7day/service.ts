/**
 * 한국 청약철회 7일 모듈 서비스
 *
 * 출처:
 *  - 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ① (인도일 + 7 일 청약철회)
 *  - 동법 §17 ② 단서 (예외 사유)
 *  - 동법 §17 ② (반품 배송비 부담 주체)
 *  - 동법 §18 ① (청약철회 통지 받은 날부터 영업일 3 일 이내 환불 의무)
 *
 * 주요 메서드:
 *  - calculateEligibility           = 인도일 + 7 일 청약철회 가능 마감일 계산 + 레코드 생성
 *  - isWithdrawable                 = 현재 시각이 청약철회 가능 기간 내인지 판정
 *  - claimWithdrawal                = 청약철회 신청 (자동 승인 단순변심 사유)
 *  - requireBusinessDayRefundSLA    = 청약철회 시점 + 영업일 3 일 = 환불 SLA 마감일 계산
 */
import { MedusaService } from "@medusajs/framework/utils"
import WithdrawalEligibility from "./models/withdrawal-eligibility"
import WithdrawalReasonRecord, {
  WithdrawalReason,
  WithdrawalReasonCode,
} from "./models/withdrawal-reason"
import { addBusinessDays, addCalendarDays } from "./utils/business-day"

class WithdrawalSevenDayModuleService extends MedusaService({
  WithdrawalEligibility,
  WithdrawalReasonRecord,
}) {
  /**
   * 청약철회 가능 여부 계산 + 레코드 upsert.
   *
   * 동작:
   *  - eligible_until = delivered_at + 7 일 (전자상거래법 §17 ① 달력일 기준)
   *  - 기존 order_id 의 레코드가 있으면 갱신, 없으면 생성합니다 (1:1 link 가정).
   *
   * @param orderId 메두사 order.id
   * @param deliveredAt 인도일 (배송 완료 시각)
   * @returns 생성·갱신된 WithdrawalEligibility 레코드
   */
  async calculateEligibility(
    orderId: string,
    deliveredAt: Date
  ): Promise<any> {
    // delivered_at + 7 일 = 청약철회 마감일
    const eligibleUntil = addCalendarDays(deliveredAt, 7)

    // 기존 레코드 조회 (1:1 link 정합 보장)
    const existing = await this.listWithdrawalEligibilities({
      order_id: orderId,
    })

    if (existing.length > 0) {
      const [updated] = await this.updateWithdrawalEligibilities([
        {
          id: existing[0].id,
          delivered_at: deliveredAt,
          eligible_until: eligibleUntil,
          // 예외 사유는 별도 평가 로직 (Phase 2 / 후속) 에서 갱신합니다.
          is_eligible: existing[0].is_eligible,
          disqualified_reason: existing[0].disqualified_reason,
        },
      ])
      return updated
    }

    const [created] = await this.createWithdrawalEligibilities([
      {
        order_id: orderId,
        delivered_at: deliveredAt,
        eligible_until: eligibleUntil,
        is_eligible: true,
        disqualified_reason: null,
      },
    ])
    return created
  }

  /**
   * 현재 시각 기준 청약철회 가능 여부 판정.
   *
   * 판정 룰 (출처: 전자상거래법 §17 ①):
   *  - 레코드가 없으면 false (배송 미완료 등)
   *  - is_eligible = false (예외 사유 해당) 면 false
   *  - 현재 시각 ≤ eligible_until 이면 true
   *
   * @param orderId 메두사 order.id
   * @returns 청약철회 가능 = true
   */
  async isWithdrawable(orderId: string): Promise<boolean> {
    const list = await this.listWithdrawalEligibilities({
      order_id: orderId,
    })
    if (list.length === 0) {
      return false
    }
    const eligibility = list[0]
    if (!eligibility.is_eligible) {
      return false
    }
    const now = new Date()
    const deadline = new Date(eligibility.eligible_until as unknown as string)
    return now.getTime() <= deadline.getTime()
  }

  /**
   * 청약철회 신청 + 자동 승인 단순변심.
   *
   * 동작:
   *  - 사유 code 검증 (enum 4 종) → 잘못된 사유는 에러
   *  - 청약철회 가능 기간 내인지 검증 → 기간 초과는 에러
   *  - WithdrawalReasonRecord 생성 (claimed_at = 현재 시각)
   *  - 단순변심(SIMPLE_CHANGE) 사유는 별도 관리자 검토 없이 자동 승인 처리됨 (사후 메두사 Return.status = approved 갱신은 subscriber 영역)
   *
   * @param orderId 메두사 order.id
   * @param reason 청약철회 사유 코드
   * @param description 상세 설명 (선택)
   * @returns 생성된 WithdrawalReasonRecord
   */
  async claimWithdrawal(
    orderId: string,
    reason: WithdrawalReasonCode | WithdrawalReason,
    description?: string
  ): Promise<any> {
    // 사유 코드 검증
    const validCodes = Object.values(WithdrawalReason) as string[]
    if (!validCodes.includes(reason as string)) {
      throw new Error(
        `[withdrawal7Day] 유효하지 않은 청약철회 사유입니다: ${reason}`
      )
    }

    // 청약철회 가능 기간 검증 (전자상거래법 §17 ①)
    const withdrawable = await this.isWithdrawable(orderId)
    if (!withdrawable) {
      throw new Error(
        `[withdrawal7Day] 청약철회 가능 기간이 지났거나 자격이 없습니다. order_id=${orderId}`
      )
    }

    const claimedAt = new Date()
    const [created] = await this.createWithdrawalReasonRecords([
      {
        order_id: orderId,
        reason: reason as WithdrawalReasonCode,
        description: description ?? null,
        claimed_at: claimedAt,
      },
    ])
    return created
  }

  /**
   * 환불 SLA 마감일 계산.
   *
   * 출처: 전자상거래법 §18 ① (청약철회 통지 받은 날부터 영업일 3 일 이내 환불)
   *
   * 동작:
   *  - 최신 WithdrawalReasonRecord.claimed_at 을 기산점으로 함.
   *  - 영업일 3 일 후의 Date 를 SLA deadline 으로 반환.
   *  - 청약철회 신청 이력이 없으면 에러.
   *
   * @param orderId 메두사 order.id
   * @returns 환불 마감 시각 (영업일 3 일 후)
   */
  async requireBusinessDayRefundSLA(orderId: string): Promise<Date> {
    const records = await this.listWithdrawalReasonRecords(
      { order_id: orderId },
      { order: { claimed_at: "DESC" } }
    )
    if (records.length === 0) {
      throw new Error(
        `[withdrawal7Day] 청약철회 신청 이력이 없습니다. order_id=${orderId}`
      )
    }
    const latest = records[0]
    const claimedAt = new Date(latest.claimed_at as unknown as string)
    // 영업일 3 일 후 마감 (전자상거래법 §18 ①)
    return addBusinessDays(claimedAt, 3)
  }
}

export default WithdrawalSevenDayModuleService

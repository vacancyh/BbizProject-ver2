/**
 * OrderExchangeGroupModuleService
 * ─────────────────────────────────────────────────────────────────────────────
 * 다건 교환 그룹(exchange_group) 모듈 서비스.
 *
 * MedusaService 팩토리가 ExchangeGroup 모델에 대한 기본 CRUD 메서드를 자동 생성합니다.
 * 본 클래스는 그 위에 3개의 비즈니스 메서드를 추가합니다.
 *
 * 메서드:
 *  - createGroup(orderId, exchangeIds, pickupTrackingNo?)  : 그룹 생성
 *  - addToGroup(groupId, exchangeId)                       : 그룹에 교환 추가
 *  - getGroup(groupId)                                     : 그룹 단건 조회
 *
 * 로직 복사 금지 — Medusa core exchange 는 route 에서 워크플로우 호출로 처리.
 */
import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import { ExchangeGroup } from "./models/exchange-group"

class OrderExchangeGroupModuleService extends MedusaService({
  ExchangeGroup,
}) {
  /**
   * 다건 교환 그룹을 생성합니다.
   *
   * @param orderId           Medusa order.id
   * @param exchangeIds       묶을 exchange id 배열 (1개 이상)
   * @param pickupTrackingNo  1회 회수 운송장 번호 (선택)
   */
  async createGroup(
    orderId: string,
    exchangeIds: string[],
    pickupTrackingNo?: string
  ): Promise<any> {
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[order-exchange-group] orderId 는 필수입니다."
      )
    }
    if (!exchangeIds || exchangeIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "[order-exchange-group] exchangeIds 는 1개 이상 필요합니다."
      )
    }

    const groups = await this.createExchangeGroups([
      {
        order_id: orderId,
        total_price_diff: 0,
        pickup_tracking_no: pickupTrackingNo ?? null,
        version: 1,
        status: "PENDING",
        // exchange_ids 는 jsonb 컬럼 — MedusaService 타입 호환을 위해 캐스팅
        exchange_ids: exchangeIds as unknown as Record<string, unknown>,
      },
    ])
    return (groups as any[])[0]
  }

  /**
   * 기존 그룹에 교환 id를 추가합니다 (낙관적 잠금: version +1).
   *
   * @param groupId    대상 exchange_group.id
   * @param exchangeId 추가할 exchange id
   */
  async addToGroup(groupId: string, exchangeId: string): Promise<any> {
    const groups = await this.listExchangeGroups(
      { id: groupId },
      { take: 1 }
    )

    if (!groups || groups.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `[order-exchange-group] 그룹 ${groupId} 를 찾을 수 없습니다.`
      )
    }

    const group = groups[0]
    const currentIds: string[] = Array.isArray(group.exchange_ids)
      ? (group.exchange_ids as string[])
      : []

    if (currentIds.includes(exchangeId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[order-exchange-group] exchange ${exchangeId} 는 이미 그룹 ${groupId} 에 포함되어 있습니다.`
      )
    }

    const updated = await this.updateExchangeGroups(
      { id: groupId },
      {
        exchange_ids: [...currentIds, exchangeId] as unknown as Record<string, unknown>,
        version: (group.version as number) + 1,
      }
    )
    // MedusaService update 반환 타입이 단일 객체/배열 혼용 — unknown 경유 캐스팅
    const updatedArr = updated as unknown as any[]
    return Array.isArray(updatedArr) ? updatedArr[0] : updated
  }

  /**
   * 교환 그룹 단건을 조회합니다.
   *
   * @param groupId exchange_group.id
   */
  async getGroup(groupId: string): Promise<any> {
    const groups = await this.listExchangeGroups(
      { id: groupId },
      { take: 1 }
    )

    if (!groups || groups.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `[order-exchange-group] 그룹 ${groupId} 를 찾을 수 없습니다.`
      )
    }

    return groups[0]
  }
}

export default OrderExchangeGroupModuleService

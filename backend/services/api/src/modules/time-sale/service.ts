/**
 * 타임세일 모듈 서비스.
 *  - createSale(input)         = 세일 생성(status 는 미지정 시 starts_at/now 로 산정)
 *  - listSales(filter)         = 세일 목록(product_id/status 필터, 최신순) + Number 정규화
 *  - getSale(id)               = 단건 조회(없으면 null) + Number 정규화
 *  - endSale(id)               = 강제 종료(status="ended")
 *  - listActiveSales(now)      = 진행 중(active) 세일만 반환(상태는 logic 으로 재판정)
 *  - endExpiredSales(nowIso)   = 시간 만료된 active 세일 일괄 종료(cron job 에서 호출)
 *  - getPriceRestoreTargets()  = 원가복원 대상 세일 목록(ended + original_price 존재)
 *
 * 함정 메모(오늘 발견): model.number() 의 numeric 컬럼은 list/get 시 string 으로
 * 돌아올 수 있어, 반환 직전 toView() 로 discount_value/original_price 를 Number() 정규화.
 * 상태 판정(scheduled/active/ended)은 logic.ts 에 위임(중복 구현 금지).
 *
 * cron: time-sale-expiry-check job (jobs/time-sale-expiry-check.ts, 5분 주기)
 */
import { MedusaService } from "@medusajs/framework/utils"
import TimeSale from "./models/time-sale"
import {
  resolveSaleStatus,
  isSaleActive,
  type DiscountType,
  type SaleStatus,
} from "./logic"

export type { DiscountType, SaleStatus } from "./logic"

export type SaleListFilter = { product_id?: string; status?: SaleStatus }

export type CreateSaleInput = {
  product_id: string
  title: string
  discount_type: DiscountType
  discount_value: number
  original_price?: number | null
  starts_at: string
  ends_at: string
  status?: SaleStatus
}

class TimeSaleModuleService extends MedusaService({
  TimeSale,
}) {
  /**
   * numeric 필드 정규화(string → number). model.number() 의 함정 회피.
   */
  private toView(row: any): any {
    if (!row) return row
    return {
      ...row,
      discount_value:
        row.discount_value === null || row.discount_value === undefined
          ? row.discount_value
          : Number(row.discount_value),
      original_price:
        row.original_price === null || row.original_price === undefined
          ? row.original_price
          : Number(row.original_price),
    }
  }

  async createSale(input: CreateSaleInput): Promise<any> {
    const status =
      input.status ??
      resolveSaleStatus(input.starts_at, input.ends_at, new Date().toISOString())
    const [created] = await this.createTimeSales([
      {
        product_id: input.product_id,
        title: input.title,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        original_price: input.original_price ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        status,
      },
    ])
    return this.toView(created)
  }

  async listSales(
    filter: SaleListFilter = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ items: any[]; count: number }> {
    const where: Record<string, unknown> = {}
    if (filter.product_id) where.product_id = filter.product_id
    if (filter.status) where.status = filter.status
    const limit = Math.min(pagination.limit ?? 50, 200)
    const offset = pagination.offset ?? 0
    const [items, count] = await this.listAndCountTimeSales(where, {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    })
    return { items: items.map((r: any) => this.toView(r)), count }
  }

  async getSale(id: string): Promise<any | null> {
    const found = await this.retrieveTimeSale(id).catch(() => null)
    return found ? this.toView(found) : null
  }

  async endSale(id: string): Promise<any> {
    const updated = await this.updateTimeSales({ id, status: "ended" })
    return this.toView(Array.isArray(updated) ? updated[0] : updated)
  }

  /**
   * 현재 시각(nowIso) 기준 진행 중인 세일만 반환.
   * DB 의 status 가 아직 갱신되지 않았을 수 있어 logic.isSaleActive 로 재판정.
   */
  async listActiveSales(nowIso: string): Promise<any[]> {
    const [items] = await this.listAndCountTimeSales(
      {},
      { order: { created_at: "DESC" } }
    )
    return items
      .filter((r: any) => isSaleActive(r.starts_at, r.ends_at, nowIso))
      .map((r: any) => this.toView(r))
  }

  /**
   * 시간 만료된 active 세일을 일괄 종료 처리.
   *
   * cron job(jobs/time-sale-expiry-check.ts) 에서 5분마다 호출.
   * 반환: { ended: 종료된 세일 id 목록, priceRestoreTargets: 원가복원 대상(original_price 보유 항목) }
   *
   * 재고 소진 자동 종료는 Medusa Inventory 모듈 연동 후 확장 예정.
   * TODO(사장님결정): Inventory 모듈 연동 방식 확정 후 재고 소진 분기 추가.
   */
  async endExpiredSales(nowIso: string): Promise<{
    ended: string[]
    priceRestoreTargets: Array<{ sale_id: string; product_id: string; original_price: number }>
  }> {
    // active 상태 세일 전체 조회
    const { items: activeSales } = await this.listSales({ status: "active" }, { limit: 200 })

    const ended: string[] = []
    const priceRestoreTargets: Array<{
      sale_id: string
      product_id: string
      original_price: number
    }> = []

    for (const sale of activeSales) {
      const resolved = resolveSaleStatus(sale.starts_at, sale.ends_at, nowIso)
      if (resolved === "ended") {
        await this.endSale(sale.id)
        ended.push(sale.id)

        // 원가복원 대상: original_price 스냅샷이 존재하는 세일
        if (sale.original_price !== null && sale.original_price !== undefined) {
          priceRestoreTargets.push({
            sale_id: sale.id,
            product_id: sale.product_id,
            original_price: Number(sale.original_price),
          })
        }
      }
    }

    return { ended, priceRestoreTargets }
  }

  /**
   * 원가복원 대상 세일 목록.
   *
   * ended 상태이고 original_price 가 존재하는 항목만 반환.
   * Medusa Pricing API 연동 후 이 목록을 순회하여 가격 원복 처리.
   * TODO(사장님결정): Medusa Pricing 모듈 연동 후 실제 price_rule 갱신 로직 추가.
   */
  async getPriceRestoreTargets(): Promise<
    Array<{ sale_id: string; product_id: string; original_price: number }>
  > {
    const { items: endedSales } = await this.listSales({ status: "ended" }, { limit: 200 })
    return endedSales
      .filter((s: any) => s.original_price !== null && s.original_price !== undefined)
      .map((s: any) => ({
        sale_id: s.id,
        product_id: s.product_id,
        original_price: Number(s.original_price),
      }))
  }
}

export default TimeSaleModuleService

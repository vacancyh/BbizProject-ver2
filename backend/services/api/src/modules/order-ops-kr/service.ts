/**
 * 주문 운영(한국형) 모듈 서비스 — 관리자 메모 + 환불 기록 + 멱등키 캐시.
 *
 * 주요 메서드:
 *  - addMemo(orderId, content, author, kind)          = 내부 메모 1건 추가(고객 비노출)
 *  - listMemos(orderId)                               = 주문별 메모 최신순 조회
 *  - recordCancellation(input)                        = 환불/취소 기록 append-only
 *  - findIdempotency(key)                             = 멱등키 조회 (없으면 null)
 *  - saveIdempotency(key, response, expiresAt)        = 멱등키 저장
 *
 * 강제취소/출고 등 Medusa 워크플로우 호출은 엔드포인트(src/api/admin/orders-kr)에서 수행하고,
 * 본 서비스는 한국형 부가 데이터(메모/사유/환불기록/멱등)만 보관한다(로직 복사·재구현 금지).
 *
 * spec: dag/d2_주문관리/t007_환불.md §7 DB
 */
import { MedusaService } from "@medusajs/framework/utils"
import OrderAdminNote from "./models/order-admin-memo"
import OrderCancellation from "./models/order-cancellation"
import RefundIdempotency from "./models/refund-idempotency"

export type MemoAuthor = { id?: string | null; email?: string | null }

/** recordCancellation 입력 타입 */
export type CancellationInput = {
  order_id: string
  refund_amount: number
  /** pg = 원결제 PG 취소 | account = 계좌 현금 입금 */
  refund_method: "pg" | "account"
  /** 계좌 입금 시 은행·계좌·예금주 JSON. PG 취소 시 undefined/null. */
  account_info?: Record<string, unknown> | null
  restored_points?: number
  restored_coupon?: number
  reason: string
}

class OrderOpsKrModuleService extends MedusaService({
  OrderAdminNote,
  OrderCancellation,
  RefundIdempotency,
}) {
  /** 내부 메모 1건 추가. kind=memo(일반)/cancel(강제취소 사유)/system. */
  async addMemo(
    orderId: string,
    content: string,
    author: MemoAuthor = {},
    kind: "memo" | "cancel" | "system" = "memo"
  ): Promise<any> {
    if (!content || !content.trim()) {
      throw new Error("[order-ops-kr] 메모 내용이 비어 있습니다.")
    }
    const [created] = await this.createOrderAdminNotes([
      {
        order_id: orderId,
        content: content.trim(),
        kind,
        author_id: author.id ?? null,
        author_email: author.email ?? null,
      },
    ])
    return created
  }

  /** 주문별 메모 최신순 조회. */
  async listMemos(orderId: string): Promise<any[]> {
    return this.listOrderAdminNotes(
      { order_id: orderId },
      { order: { created_at: "DESC" } }
    )
  }

  /**
   * 메모 1건 삭제.
   * 권한 검증(본인/SUPER)은 route 에서 수행 후 호출.
   * 메모 없으면 null 반환(route 가 404 처리).
   */
  async deleteMemo(memoId: string): Promise<boolean> {
    const rows = await this.listOrderAdminNotes({ id: memoId }, { take: 1 })
    if (!rows.length) return false
    await this.deleteOrderAdminNotes([memoId])
    return true
  }

  /**
   * 환불/취소 기록 1건 적재(append-only).
   *
   * spec: t007_환불.md §7 DB(order_cancellation)
   */
  async recordCancellation(input: CancellationInput): Promise<any> {
    const [created] = await this.createOrderCancellations([
      {
        order_id: input.order_id,
        refund_amount: input.refund_amount,
        refund_method: input.refund_method,
        account_info: input.account_info ?? null,
        restored_points: input.restored_points ?? 0,
        restored_coupon: input.restored_coupon ?? 0,
        reason: input.reason,
      },
    ])
    return created
  }

  /**
   * 멱등키 조회. 없으면 null 반환.
   *
   * spec: t007_환불.md §4 I2, §8 C1
   */
  async findIdempotency(key: string): Promise<any | null> {
    const rows = await this.listRefundIdempotencies({ key }, { take: 1 })
    return rows[0] ?? null
  }

  /**
   * 멱등키 + 캐시 응답 저장.
   *
   * @param key        멱등키
   * @param response   최초 응답 JSON
   * @param expiresAt  만료 일시 (기본 24h 후 — 호출자가 계산)
   */
  async saveIdempotency(
    key: string,
    response: Record<string, unknown>,
    expiresAt: Date
  ): Promise<any> {
    const [created] = await this.createRefundIdempotencies([
      {
        key,
        cached_response: response,
        expires_at: expiresAt,
      },
    ])
    return created
  }
}

export default OrderOpsKrModuleService

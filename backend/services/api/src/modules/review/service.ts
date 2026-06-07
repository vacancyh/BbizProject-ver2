/**
 * 리뷰·문의 모듈 서비스.
 *  - query(filter, pagination) = 리뷰/문의 조회(type/status 필터 + 페이지네이션, 최신순)
 *  - setStatus(id, status)     = 공개/숨김/대기 상태 변경
 *  - addReply(id, reply)       = 운영자 답변 등록(문의는 answered 로 전환)
 *  - create(input)             = 리뷰/문의 생성(시드·연동용, 이메일 마스킹)
 */
import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"

export type ReviewStatus = "pending" | "published" | "hidden" | "answered"
export type ReviewType = "review" | "inquiry"

export type ReviewQueryFilter = { type?: ReviewType; status?: ReviewStatus }

function maskEmail(email?: string | null): string | null {
  if (!email) return null
  return email.replace(/^([A-Za-z0-9._%+-]{1,2})[^@]*(@.*)$/, "$1****$2")
}

class ReviewModuleService extends MedusaService({
  Review,
}) {
  async query(
    filter: ReviewQueryFilter = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ items: any[]; count: number }> {
    const where: Record<string, unknown> = {}
    if (filter.type) where.type = filter.type
    if (filter.status) where.status = filter.status
    const limit = Math.min(pagination.limit ?? 50, 200)
    const offset = pagination.offset ?? 0
    const [items, count] = await this.listAndCountReviews(where, {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    })
    return { items, count }
  }

  async setStatus(id: string, status: ReviewStatus): Promise<any> {
    return this.updateReviews({ id, status })
  }

  async addReply(id: string, reply: string): Promise<any> {
    return this.updateReviews({ id, reply, replied_at: new Date(), status: "answered" })
  }

  async create(input: {
    type: ReviewType
    product_id?: string | null
    product_title?: string | null
    author_name?: string | null
    author_email?: string | null
    rating?: number | null
    title?: string | null
    content: string
    status?: ReviewStatus
  }): Promise<any> {
    const [created] = await this.createReviews([
      {
        type: input.type,
        product_id: input.product_id ?? null,
        product_title: input.product_title ?? null,
        author_name: input.author_name ?? null,
        author_email: maskEmail(input.author_email),
        rating: input.rating ?? null,
        title: input.title ?? null,
        content: input.content,
        status: input.status ?? "pending",
        reply: null,
        replied_at: null,
      },
    ])
    return created
  }
}

export default ReviewModuleService

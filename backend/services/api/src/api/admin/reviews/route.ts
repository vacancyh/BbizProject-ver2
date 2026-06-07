/**
 * 리뷰·문의 목록 Admin API
 *  - GET /admin/reviews?type=&status=&limit=&offset=
 * 권한 검사(write)는 src/api/middlewares.ts 가 reviews 메뉴 기준으로 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../modules/review"
import ReviewModuleService, { type ReviewQueryFilter } from "../../../modules/review/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const q = req.query as Record<string, string | undefined>
  const filter: ReviewQueryFilter = {}
  if (q.type === "review" || q.type === "inquiry") filter.type = q.type
  if (q.status && ["pending", "published", "hidden", "answered"].includes(q.status)) {
    filter.status = q.status as ReviewQueryFilter["status"]
  }
  const limit = q.limit ? Number(q.limit) : 50
  const offset = q.offset ? Number(q.offset) : 0
  const { items, count } = await svc.query(filter, { limit, offset })
  res.json({ reviews: items, count, limit, offset })
}

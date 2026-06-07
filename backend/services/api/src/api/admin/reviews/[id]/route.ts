/**
 * 리뷰·문의 단건 조회/변경 Admin API
 *  - GET  /admin/reviews/:id            단건 조회
 *  - POST /admin/reviews/:id            { status?, reply? } 상태 변경 / 답변 등록
 * 권한 검사·감사 기록은 src/api/middlewares.ts(reviews 메뉴) 가 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../modules/review"
import ReviewModuleService, { type ReviewStatus } from "../../../../modules/review/service"

const VALID_STATUS: ReviewStatus[] = ["pending", "published", "hidden", "answered"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const found = await svc.retrieveReview(req.params.id).catch(() => null)
  if (!found) {
    res.status(404).json({ message: "존재하지 않는 리뷰/문의입니다." })
    return
  }
  res.json({ review: found })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const body = (req.body ?? {}) as { status?: string; reply?: string }

  if (body.reply !== undefined) {
    if (!body.reply.trim()) {
      res.status(400).json({ message: "답변 내용이 비어 있습니다." })
      return
    }
    const updated = await svc.addReply(req.params.id, body.reply.trim())
    res.json({ review: updated })
    return
  }

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status as ReviewStatus)) {
      res.status(400).json({ message: `허용되지 않은 상태입니다: ${body.status}` })
      return
    }
    const updated = await svc.setStatus(req.params.id, body.status as ReviewStatus)
    res.json({ review: updated })
    return
  }

  res.status(400).json({ message: "status 또는 reply 가 필요합니다." })
}

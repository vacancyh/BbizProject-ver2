/**
 * 상품 리뷰 Store API (스토어프론트 노출용)
 *  - GET  /store/products/:id/reviews  → 공개(published) 리뷰 목록 + 요약(평균/분포)
 *  - POST /store/products/:id/reviews  → 리뷰 작성(상태 pending, 운영자 검수 후 공개)
 * 가드레일: Medusa core 미수정. review 모듈 전용 테이블만 사용. 작성자 이메일은 서비스가 마스킹.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/service"
import { checkText } from "../../../../_utils/text"

type ReviewRatingKey = 1 | 2 | 3 | 4 | 5

// 작성자명 서버측 마스킹(보안점검 2026-07-27): 클라이언트 입력과 무관하게 노출 시 개인정보 보호.
function maskName(name?: string | null): string {
  if (!name) return "익명"
  const n = String(name).trim()
  if (!n) return "익명"
  return n.length <= 1 ? n + "*" : n[0] + "**"
}

function toStoreReview(r: any) {
  return {
    id: r.id,
    product_id: r.product_id,
    author: maskName(r.author_name),
    rating: r.rating ?? 0,
    title: r.title ?? undefined,
    content: r.content,
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
    reply: r.reply ?? undefined,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "product_id",
      "author_name",
      "rating",
      "title",
      "content",
      "created_at",
      "reply",
    ],
    filters: {
      product_id: productId,
      type: "review",
      status: "published",
    } as Record<string, unknown>,
  })

  const reviews = (data ?? [])
    .sort((a: any, b: any) =>
      String(a.created_at) < String(b.created_at) ? 1 : -1
    )
    .map(toStoreReview)

  const distribution: Record<ReviewRatingKey, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }
  let sum = 0
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as ReviewRatingKey] += 1
      sum += r.rating
    }
  }
  const count = reviews.length
  const average = count ? Math.round((sum / count) * 10) / 10 : 0

  res.json({ reviews, summary: { average, count, distribution } })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const body = (req.body ?? {}) as {
    author_name?: string
    author_email?: string
    rating?: number
    title?: string
    content?: string
  }

  if (!body.content || typeof body.rating !== "number") {
    res.status(400).json({ message: "rating(1~5)과 content는 필수입니다." })
    return
  }
  const lenErr =
    checkText(body.content, { field: "리뷰 내용", max: 5000, required: true }) ||
    checkText(body.title, { field: "제목", max: 200 }) ||
    checkText(body.author_name, { field: "작성자명", max: 50 })
  if (lenErr) {
    res.status(400).json({ message: lenErr })
    return
  }

  const created = await svc.create({
    type: "review",
    product_id: productId,
    author_name: body.author_name ?? "익명",
    author_email: body.author_email ?? null,
    rating: Math.min(5, Math.max(1, Math.round(body.rating))),
    title: body.title ?? null,
    content: body.content,
    status: "pending", // 운영자 검수 후 공개
  })

  res.status(201).json({ review: toStoreReview(created), pending: true })
}

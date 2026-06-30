/**
 * 상품 문의(Q&A) Store API
 *  - GET  /store/products/:id/inquiries → 공개 가능한 문의(답변완료/공개) 목록 (질문+운영자 답변)
 *  - POST /store/products/:id/inquiries → 문의 등록(상태 pending, 운영자 답변 대기)
 * review 모듈 type="inquiry" 사용. 작성자 이메일은 서비스가 마스킹.
 * 가드레일: Medusa core 미수정. review 모듈 전용 테이블만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/service"

function toStoreInquiry(r: any) {
  return {
    id: r.id,
    author: r.author_name ?? "익명",
    content: r.content,
    created_at:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    reply: r.reply ?? null,
    replied_at: r.replied_at
      ? r.replied_at instanceof Date
        ? r.replied_at.toISOString()
        : String(r.replied_at)
      : null,
    answered: !!r.reply,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "review",
    fields: [
      "id",
      "author_name",
      "content",
      "created_at",
      "reply",
      "replied_at",
      "status",
    ],
    filters: {
      product_id: productId,
      type: "inquiry",
      status: ["published", "answered"],
    } as Record<string, unknown>,
  })

  const inquiries = (data ?? [])
    .sort((a: any, b: any) =>
      String(a.created_at) < String(b.created_at) ? 1 : -1
    )
    .map(toStoreInquiry)

  res.json({ inquiries })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const body = (req.body ?? {}) as {
    author_name?: string
    author_email?: string
    content?: string
  }

  if (!body.content || body.content.trim().length < 5) {
    res.status(400).json({ message: "문의 내용을 5자 이상 입력해 주세요." })
    return
  }

  const created = await svc.create({
    type: "inquiry",
    product_id: productId,
    author_name: body.author_name ?? "익명",
    author_email: body.author_email ?? null,
    rating: null,
    title: null,
    content: body.content.trim(),
    status: "pending",
  })

  res.status(201).json({ inquiry: toStoreInquiry(created), pending: true })
}

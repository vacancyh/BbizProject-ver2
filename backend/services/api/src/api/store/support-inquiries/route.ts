/**
 * 1:1 문의(상품무관) Store API
 *  - POST /store/support-inquiries → 일반 1:1 문의 등록
 * review 모듈 type="inquiry" + product_id=null 로 저장 → 기존 어드민 "리뷰·문의" 화면에서 답변 처리.
 * 분류(category)는 제목에 prefix 로 기록해 어드민에서 식별 가능하게 한다.
 * 가드레일: Medusa core 미수정. review 모듈 전용 테이블만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/service"

const CATEGORIES = ["주문/결제", "배송", "교환/반품", "회원/적립금", "기타"]

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEW_MODULE) as unknown as ReviewModuleService
  const b = (req.body ?? {}) as {
    author_name?: string
    author_email?: string
    category?: string
    subject?: string
    content?: string
  }

  if (!b.content || b.content.trim().length < 5) {
    res.status(400).json({ message: "문의 내용을 5자 이상 입력해 주세요." })
    return
  }
  if (!b.author_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.author_email)) {
    res.status(400).json({ message: "답변 받을 이메일을 정확히 입력해 주세요." })
    return
  }
  const category = CATEGORIES.includes(String(b.category)) ? b.category : "기타"
  const subject = (b.subject ?? "").trim() || "1:1 문의"

  const created = await svc.create({
    type: "inquiry",
    product_id: null,
    author_name: b.author_name?.trim() || "고객",
    author_email: b.author_email,
    rating: null,
    title: `[1:1문의/${category}] ${subject}`,
    content: b.content.trim(),
    status: "pending",
  })

  res.status(201).json({ id: created.id, pending: true })
}

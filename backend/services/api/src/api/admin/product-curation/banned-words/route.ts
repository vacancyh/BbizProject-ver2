/**
 * 금칙어 Admin API
 *
 *  - GET  /admin/product-curation/banned-words?scope=all|search|product_name|review
 *      금칙어 목록 조회(scope 필터 선택)
 *      // TODO(사장님결정): 금칙어 목록 노출 정책(페이지네이션, 정렬 기준 등)
 *
 *  - POST /admin/product-curation/banned-words
 *      금칙어 등록
 *      Body: { word: string, scope?: "all"|"search"|"product_name"|"review" }
 *
 *  - DELETE /admin/product-curation/banned-words
 *      금칙어 삭제
 *      Body: { word: string }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../modules/product-curation"
import ProductCurationModuleService from "../../../../modules/product-curation/service"
import type { BannedWordScope } from "../../../../modules/product-curation/logic"

const VALID_SCOPES: BannedWordScope[] = ["all", "search", "product_name", "review"]

/** GET /admin/product-curation/banned-words?scope=... */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const scopeParam = req.query.scope as string | undefined
  const scope = scopeParam && VALID_SCOPES.includes(scopeParam as BannedWordScope)
    ? (scopeParam as BannedWordScope)
    : undefined

  try {
    const items = await svc.getBannedWords(scope)
    res.json({ banned_words: items, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** POST /admin/product-curation/banned-words — 금칙어 등록 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const body = req.body as { word?: string; scope?: string }

  if (!body?.word?.trim()) {
    res.status(400).json({ message: "word 가 필요합니다." })
    return
  }

  const scope = body.scope && VALID_SCOPES.includes(body.scope as BannedWordScope)
    ? (body.scope as BannedWordScope)
    : "all"

  // 등록 운영자 actor_id (인증 미들웨어에서 주입)
  const actorId: string | null = (req as any).auth_context?.actor_id ?? null

  try {
    const record = await svc.addBannedWord(body.word.trim(), scope, actorId)
    res.status(201).json({ banned_word: record })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    // 중복 등록은 400, 나머지는 500
    const status = message.includes("이미 등록된") ? 409 : 500
    res.status(status).json({ message })
  }
}

/** DELETE /admin/product-curation/banned-words — 금칙어 삭제 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const body = req.body as { word?: string }

  if (!body?.word?.trim()) {
    res.status(400).json({ message: "word 가 필요합니다." })
    return
  }

  try {
    await svc.removeBannedWord(body.word.trim())
    res.status(200).json({ message: "금칙어가 삭제되었습니다." })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes("찾을 수 없습니다") ? 404 : 500
    res.status(status).json({ message })
  }
}

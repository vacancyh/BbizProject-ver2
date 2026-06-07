/**
 * 약관 게시 Admin API
 *
 *  - POST /admin/legal-docs/:id/publish
 *      draft 약관을 published 상태로 전이.
 *      필수 동의(requires_consent=true)인 경우 동의 재요청 트리거 페이로드를 응답에 포함.
 *      A1 (t008 §5)
 *
 * 로직 재구현 X — LegalDocModuleService.publishDoc 호출/래핑.
 * 권한 검사는 /admin 미들웨어(인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_DOC_MODULE } from "../../../../../modules/legal-kr/legal-doc"
import LegalDocModuleService from "../../../../../modules/legal-kr/legal-doc/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  // 게시 처리자: 인증 미들웨어에서 주입된 user id (없으면 anonymous)
  const actorId: string =
    (req as unknown as { user?: { id?: string } }).user?.id ?? "anonymous"

  const svc = req.scope.resolve(
    LEGAL_DOC_MODULE
  ) as unknown as LegalDocModuleService

  try {
    const result = await svc.publishDoc(id, actorId)
    res.json({
      doc: result.doc,
      // requires_consent=true 인 경우 동의 재요청 트리거 페이로드 포함 (d5 t008 연동)
      consent_trigger: result.consentTrigger,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ message })
  }
}

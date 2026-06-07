/**
 * 약관 목록/초안 생성 Admin API
 *
 *  - GET  /admin/legal-docs?type=...
 *      종류별(또는 전체) 약관 버전 목록 조회(최신순).
 *      API1 (t008 §6)
 *
 *  - POST /admin/legal-docs
 *      새 약관 초안 생성 (draft).
 *      API2 (t008 §6)
 *
 * 로직 재구현 X — LegalDocModuleService 호출/래핑.
 * 권한 검사는 /admin 미들웨어(인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEGAL_DOC_MODULE } from "../../../modules/legal-kr/legal-doc"
import LegalDocModuleService from "../../../modules/legal-kr/legal-doc/service"
import type { LegalDocType } from "../../../modules/legal-kr/legal-doc/models/legal-doc"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const type = (req.query.type as LegalDocType | undefined) ?? undefined
  const svc = req.scope.resolve(
    LEGAL_DOC_MODULE
  ) as unknown as LegalDocModuleService

  const docs = await svc.listByType(type)
  res.json({ docs })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    type: LegalDocType
    version: string
    body: string
    effective_at: string
    requires_consent?: boolean
  }

  const svc = req.scope.resolve(
    LEGAL_DOC_MODULE
  ) as unknown as LegalDocModuleService

  try {
    const doc = await svc.createDraft({
      type: body.type,
      version: body.version,
      body: body.body,
      effective_at: new Date(body.effective_at),
      requires_consent: body.requires_consent,
    })
    res.status(201).json({ doc })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ message })
  }
}

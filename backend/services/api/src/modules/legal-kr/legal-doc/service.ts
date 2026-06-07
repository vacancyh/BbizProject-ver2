/**
 * 약관 관리 모듈 서비스 — 버전별 관리 + 동의 재요청 트리거.
 *
 * 출처: t008_약관관리.md
 *
 * 주요 메서드:
 *  - createDraft(input)       = 약관 초안 생성 (draft 상태)
 *  - publishDoc(id, actorId)  = 게시: draft → published. 필수 동의 시 트리거 반환.
 *  - getActiveDoc(type)       = 종류별 현재 활성(published) 약관 최신 1건 조회.
 *  - listByType(type)         = 종류별 전체 버전 목록(최신순).
 *
 * 가드레일:
 *  - 게시본 직접 수정 차단 (isDirectEditBlocked)
 *  - 시행일/본문 유효성 검증 (logic.ts 위임)
 *  - 동의 재요청 트리거는 buildConsentTriggerPayload 로 생성 후 반환 (d5 연동)
 */
import { MedusaService } from "@medusajs/framework/utils"
import LegalDoc from "./models/legal-doc"
import type { LegalDocType, LegalDocStatus } from "./models/legal-doc"
import {
  isValidBodyInput,
  isValidEffectiveDate,
  isPublishable,
  isDirectEditBlocked,
  buildConsentTriggerPayload,
  type ConsentTriggerPayload,
} from "./logic"

export type CreateLegalDocInput = {
  type: LegalDocType
  version: string
  body: string
  effective_at: Date
  requires_consent?: boolean
}

export type PublishResult = {
  doc: any
  /** requires_consent=true 인 경우 동의 재요청 트리거 페이로드, 그 외 null */
  consentTrigger: ConsentTriggerPayload | null
}

class LegalDocModuleService extends MedusaService({
  LegalDoc,
}) {
  /**
   * 약관 초안 생성 (draft 상태).
   *
   * t008 §2 step2: 새 버전 작성 → draft 생성.
   * 본문/시행일 유효성은 logic.ts 로 검증.
   *
   * @param input 약관 입력값
   * @returns 생성된 LegalDoc (status=draft)
   */
  async createDraft(input: CreateLegalDocInput): Promise<any> {
    // I1: 본문 1자 이상
    if (!isValidBodyInput(input.body)) {
      throw new Error("[legalDoc] 약관 본문은 1자 이상이어야 합니다. (I1)")
    }
    // I2: 시행일 오늘 이후
    if (!isValidEffectiveDate(new Date(input.effective_at))) {
      throw new Error("[legalDoc] 시행일은 오늘 이후여야 합니다. (I2)")
    }

    const [created] = await this.createLegalDocs([
      {
        type: input.type,
        version: input.version,
        body: input.body,
        effective_at: new Date(input.effective_at),
        status: "draft",
        requires_consent: input.requires_consent ?? false,
        published_by: null,
        published_at: null,
      },
    ])
    return created
  }

  /**
   * 약관 게시: draft → published.
   *
   * t008 §2 step3 / A1: 게시 + 동의 재요청 트리거.
   * C2(t008 §8): 게시본 직접 수정 차단 → 새 버전 강제(이 메서드는 draft만 게시 허용).
   *
   * @param id LegalDoc.id
   * @param actorId 게시 처리자 admin user_id
   * @returns PublishResult (doc + consentTrigger)
   */
  async publishDoc(id: string, actorId: string): Promise<PublishResult> {
    // 현재 문서 조회
    const docs = await this.listLegalDocs({ id })
    if (!docs.length) {
      throw new Error(`[legalDoc] 약관 문서를 찾을 수 없습니다. id=${id}`)
    }
    const doc = docs[0]

    // C2: 게시본/아카이브 직접 수정 차단
    if (isDirectEditBlocked(doc.status as LegalDocStatus)) {
      throw new Error(
        `[legalDoc] 이미 게시된 약관은 수정할 수 없습니다. 새 버전을 작성하세요. (C2)`
      )
    }

    // 게시 가능 여부 (draft 만)
    if (!isPublishable(doc.status as LegalDocStatus)) {
      throw new Error(
        `[legalDoc] draft 상태인 약관만 게시할 수 있습니다. 현재 상태: ${doc.status}`
      )
    }

    const now = new Date()

    // draft → published 전이
    const [updated] = await this.updateLegalDocs([
      {
        id,
        status: "published",
        published_by: actorId,
        published_at: now,
      },
    ])

    // C1(t008 §8): 필수 약관 개정 시 동의 재요청 트리거 생성
    let consentTrigger: ConsentTriggerPayload | null = null
    if (updated.requires_consent) {
      consentTrigger = buildConsentTriggerPayload(
        updated.id,
        updated.type as LegalDocType,
        updated.version
      )
    }

    return { doc: updated, consentTrigger }
  }

  /**
   * 종류별 현재 활성(published) 약관 최신 1건 조회.
   *
   * t008 §1: 시행일 기준 버전 노출.
   *
   * @param type 약관 종류
   * @returns 활성 LegalDoc 또는 null
   */
  async getActiveDoc(type: LegalDocType): Promise<any | null> {
    const list = await this.listLegalDocs(
      { type, status: "published" },
      { order: { effective_at: "DESC" }, take: 1 }
    )
    return list[0] ?? null
  }

  /**
   * 종류별 전체 버전 목록 조회(최신순).
   *
   * t008 §2 step1 / API1: 목록 조회.
   *
   * @param type 약관 종류 (undefined = 전체 종류)
   * @returns LegalDoc[] 최신순
   */
  async listByType(type?: LegalDocType): Promise<any[]> {
    const filter: Record<string, unknown> = {}
    if (type) filter.type = type
    return this.listLegalDocs(filter, {
      order: { effective_at: "DESC" },
    })
  }
}

export default LegalDocModuleService

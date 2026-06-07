/**
 * 상품정보고시(ProductDisclosure) 모듈 서비스 — 버전 이력 관리.
 *
 *  - createDraft(input)            = 고시 초안 생성(draft 상태). 기존 draft 있으면 기존 것 반환.
 *  - publishDisclosure(id, actorId) = 게시: draft → published. 기존 published → archived 자동 전이.
 *  - getActiveDisclosure(productId) = 상품별 현행 고시(published 최신 version) 조회.
 *  - listByProduct(productId)       = 상품별 전체 버전 이력(최신 version 순).
 *  - updateDraft(id, fieldsJson)    = draft 수정(published/archived 수정 차단).
 *
 * 버전 이력 원칙:
 *  - 고시 수정 = 새 draft 생성 강제(기존 published 직접 수정 차단).
 *  - published 는 상품 당 1건만 유지(publishDisclosure 시 기존 published → archived).
 *  - archived 는 영구 보존(삭제 금지).
 *
 * 의존: legal-kr/legal-doc 서비스 패턴 참조.
 */
import { MedusaService } from "@medusajs/framework/utils"
import ProductDisclosure from "./models/product-disclosure"
import type { DisclosureStatus } from "./logic"
import {
  isPublishable,
  isDirectEditBlocked,
  parseFieldsJson,
  findMissingRequiredFields,
  isFieldsChanged,
} from "./logic"

export type CreateDisclosureInput = {
  product_id: string
  type_template_id: string
  fields_json: string
}

export type PublishDisclosureResult = {
  disclosure: any
  /** 이전 published 버전 id (archived 된 것), 최초 게시 시 null */
  previousPublishedId: string | null
}

class ProductDisclosureModuleService extends MedusaService({
  ProductDisclosure,
}) {
  /**
   * 고시 초안 생성.
   *
   * - fields_json 이 유효한 JSON 이어야 함(parseFieldsJson 검증).
   * - 같은 product_id 의 기존 draft 가 있으면 에러 반환(기존 draft 수정 후 재사용 요구).
   * - version 은 해당 상품의 최신 version + 1.
   *
   * @param input 고시 입력값
   * @param requiredKeys 법정 필수 항목 키 목록(누락 검사용, 빈 배열 = 검사 생략)
   */
  async createDraft(
    input: CreateDisclosureInput,
    requiredKeys: string[] = []
  ): Promise<any> {
    // fields_json 파싱 검증
    const fields = parseFieldsJson(input.fields_json)
    if (!fields) {
      throw new Error("[productDisclosure] fields_json 이 유효한 JSON 형식이 아닙니다.")
    }

    // 필수 항목 누락 검사 (requiredKeys 주입 시)
    if (requiredKeys.length > 0) {
      const missing = findMissingRequiredFields(requiredKeys, fields)
      if (missing.length > 0) {
        throw new Error(
          `[productDisclosure] 필수 고시 항목 누락: ${missing.join(", ")}`
        )
      }
    }

    // 같은 product_id 의 기존 draft 체크
    const existingDrafts = await this.listProductDisclosures({
      product_id: input.product_id,
      status: "draft",
    })
    if (existingDrafts.length > 0) {
      throw new Error(
        `[productDisclosure] 이미 작성 중인 초안이 있습니다. 기존 초안을 수정하거나 삭제 후 다시 시도하세요. id=${existingDrafts[0].id}`
      )
    }

    // 현재 최신 version 조회
    const allVersions = await this.listProductDisclosures(
      { product_id: input.product_id },
      { order: { version: "DESC" }, take: 1 }
    )
    const nextVersion = allVersions.length > 0 ? Number(allVersions[0].version) + 1 : 1

    const [created] = await this.createProductDisclosures([
      {
        product_id: input.product_id,
        type_template_id: input.type_template_id,
        version: nextVersion,
        fields_json: input.fields_json,
        status: "draft",
        published_by: null,
        published_at: null,
      },
    ])
    return created
  }

  /**
   * 고시 게시: draft → published.
   *
   * - draft 상태만 게시 가능(isPublishable 검증).
   * - 기존 published 버전이 있으면 archived 로 전이(상품 당 published 1건 보장).
   * - 반환: { disclosure(새 published), previousPublishedId }
   *
   * @param id      ProductDisclosure.id
   * @param actorId 게시 처리자 admin user_id
   */
  async publishDisclosure(
    id: string,
    actorId: string
  ): Promise<PublishDisclosureResult> {
    // 대상 조회
    const records = await this.listProductDisclosures({ id })
    if (!records.length) {
      throw new Error(`[productDisclosure] 고시 문서를 찾을 수 없습니다. id=${id}`)
    }
    const record = records[0]

    // 직접 수정 차단(published/archived)
    if (isDirectEditBlocked(record.status as DisclosureStatus)) {
      throw new Error(
        `[productDisclosure] 이미 게시/아카이브된 고시는 수정할 수 없습니다. 새 버전을 작성하세요.`
      )
    }

    // draft 만 게시 가능
    if (!isPublishable(record.status as DisclosureStatus)) {
      throw new Error(
        `[productDisclosure] draft 상태인 고시만 게시할 수 있습니다. 현재 상태: ${record.status}`
      )
    }

    // 기존 published 버전 archived 처리
    const existingPublished = await this.listProductDisclosures({
      product_id: record.product_id,
      status: "published",
    })

    let previousPublishedId: string | null = null

    if (existingPublished.length > 0) {
      previousPublishedId = existingPublished[0].id
      await this.updateProductDisclosures([
        { id: previousPublishedId, status: "archived" },
      ])
    }

    // draft → published 전이
    const now = new Date()
    const [updated] = await this.updateProductDisclosures([
      {
        id,
        status: "published",
        published_by: actorId,
        published_at: now,
      },
    ])

    return { disclosure: updated, previousPublishedId }
  }

  /**
   * 상품별 현행 고시(published 최신 version) 조회.
   *
   * @param productId Medusa product.id
   * @returns 현행 고시 또는 null
   */
  async getActiveDisclosure(productId: string): Promise<any | null> {
    const list = await this.listProductDisclosures(
      { product_id: productId, status: "published" },
      { order: { version: "DESC" }, take: 1 }
    )
    return list[0] ?? null
  }

  /**
   * 상품별 전체 버전 이력(최신 version 순).
   *
   * @param productId Medusa product.id
   * @returns ProductDisclosure[] version DESC 정렬
   */
  async listByProduct(productId: string): Promise<any[]> {
    return this.listProductDisclosures(
      { product_id: productId },
      { order: { version: "DESC" } }
    )
  }

  /**
   * draft 수정.
   *
   * - published/archived 직접 수정 차단(isDirectEditBlocked).
   * - fields_json 변경 없으면 기존 반환(isFieldsChanged).
   * - requiredKeys 주입 시 필수 항목 누락 검사.
   *
   * @param id         ProductDisclosure.id
   * @param fieldsJson 새 고시 항목 JSON 문자열
   * @param requiredKeys 법정 필수 항목 키 목록(빈 배열 = 검사 생략)
   */
  async updateDraft(
    id: string,
    fieldsJson: string,
    requiredKeys: string[] = []
  ): Promise<any> {
    const records = await this.listProductDisclosures({ id })
    if (!records.length) {
      throw new Error(`[productDisclosure] 고시 문서를 찾을 수 없습니다. id=${id}`)
    }
    const record = records[0]

    // published/archived 직접 수정 차단
    if (isDirectEditBlocked(record.status as DisclosureStatus)) {
      throw new Error(
        `[productDisclosure] 게시/아카이브된 고시는 직접 수정할 수 없습니다. 새 버전을 작성하세요.`
      )
    }

    // 변경 없으면 기존 반환
    if (!isFieldsChanged(record.fields_json as string, fieldsJson)) {
      return record
    }

    // fields_json 파싱 검증
    const fields = parseFieldsJson(fieldsJson)
    if (!fields) {
      throw new Error("[productDisclosure] fields_json 이 유효한 JSON 형식이 아닙니다.")
    }

    // 필수 항목 누락 검사
    if (requiredKeys.length > 0) {
      const missing = findMissingRequiredFields(requiredKeys, fields)
      if (missing.length > 0) {
        throw new Error(
          `[productDisclosure] 필수 고시 항목 누락: ${missing.join(", ")}`
        )
      }
    }

    const [updated] = await this.updateProductDisclosures([
      { id, fields_json: fieldsJson },
    ])
    return updated
  }
}

export default ProductDisclosureModuleService

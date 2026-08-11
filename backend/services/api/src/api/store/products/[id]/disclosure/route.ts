/**
 * 상품정보고시 Store API (전자상거래법 「상품정보제공고시」 노출용)
 *  - GET /store/products/:id/disclosure → 현행(published 최신) 고시 항목
 * 가드레일: Medusa core 미수정. product-disclosure 모듈 전용 테이블만 조회.
 *
 * ── 왜 `items` 를 따로 주나 (2026-08-10) ────────────────────────────────────
 * 관리자 화면은 고시를 **field_key**(`material`·`origin` 같은 영문 슬러그)로 저장한다.
 * 그런데 스토어프론트는 받은 객체의 **키를 그대로 항목명으로 찍고** 있었다.
 * 그래서 운영자가 관리자에서 고시를 입력하면 고객 화면에 이렇게 나왔다:
 *
 *     material   면 100%          ← "소재" 여야 한다
 *     origin     대한민국          ← "제조국" 여야 한다
 *
 * 시드된 두 건만 한글을 키로 갖고 있어서 화면상 멀쩡해 보였을 뿐이다.
 * 항목명은 상품유형 템플릿(`product_type_disclosure_field.label`)에 이미 있으므로
 * 여기서 붙여서 내려준다. 정렬 순서(sort_order)도 템플릿이 정한 대로 맞춘다.
 *
 * `fields` 는 기존 응답 그대로 남긴다 — 이미 쓰고 있는 곳이 깨지면 안 된다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_DISCLOSURE_MODULE } from "../../../../../modules/product-disclosure"
import { PRODUCT_TYPE_MODULE } from "../../../../../modules/product-type"
import type ProductDisclosureModuleService from "../../../../../modules/product-disclosure/service"

/** 화면에 찍을 항목 하나. `key` 는 번역·정렬에 쓰는 안정적인 식별자다. */
type DisclosureItem = { key: string; label: string; value: string }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const svc = req.scope.resolve(
    PRODUCT_DISCLOSURE_MODULE
  ) as unknown as ProductDisclosureModuleService

  const active = await svc.getActiveDisclosure(productId)
  if (!active) {
    res.json({ disclosure: null })
    return
  }

  let fields: Record<string, string> = {}
  try {
    const parsed = JSON.parse(active.fields_json as string)
    if (parsed && typeof parsed === "object") {
      fields = parsed as Record<string, string>
    }
  } catch {
    fields = {}
  }

  res.json({
    disclosure: {
      product_id: productId,
      version: active.version,
      fields,
      items: await withLabels(req, active.type_template_id as string, fields),
    },
  })
}

/**
 * 저장된 키에 항목명을 붙이고 템플릿 순서로 정렬한다.
 *
 * 두 가지 저장 형태를 모두 받아야 한다:
 *   · field_key 로 저장된 것(관리자 화면 · 정상)      → 템플릿에서 label 을 찾는다
 *   · 한글 항목명으로 저장된 것(구 시드 데이터)        → 그 키가 곧 label 이다
 * 템플릿을 못 읽어도 화면이 비면 안 되므로, 실패 시 키를 label 로 쓴다(fail-open).
 */
async function withLabels(
  req: MedusaRequest,
  templateId: string,
  fields: Record<string, string>
): Promise<DisclosureItem[]> {
  const entries = Object.entries(fields).filter(([, v]) => String(v ?? "").trim())

  let defs: { field_key: string; label: string; sort_order: number }[] = []
  try {
    const typeSvc = req.scope.resolve(PRODUCT_TYPE_MODULE) as any
    defs = await typeSvc.listProductTypeDisclosureFields(
      { type_template_id: templateId },
      { order: { sort_order: "ASC" } }
    )
  } catch {
    defs = []
  }

  const labelOf = new Map(defs.map((d) => [d.field_key, d.label]))
  const orderOf = new Map(defs.map((d, i) => [d.field_key, i]))

  return entries
    .map(([key, value]) => ({
      key,
      label: labelOf.get(key) ?? key, // 한글 키로 저장된 구 데이터는 키가 곧 항목명
      value: String(value),
      _o: orderOf.get(key) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a._o - b._o)
    .map(({ key, label, value }) => ({ key, label, value }))
}

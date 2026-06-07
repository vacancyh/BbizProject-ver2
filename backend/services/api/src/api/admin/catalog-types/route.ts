/**
 * 상품유형 Admin API
 *
 *  - GET  /admin/product-types
 *      전체 상품유형 목록 + 각 유형의 옵션 템플릿을 반환(rank 오름차순).
 *  - POST /admin/product-types
 *      상품유형 1개 생성 ({ name, disclosure_code?, rank?, options?: [{option_title, option_values[], rank?}] })
 *
 * 메두사 코어 상품 API 는 건드리지 않고 한국형 상품유형 모듈만 사용한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_TYPE_MODULE } from "../../../modules/product-type"
import ProductTypeModuleService from "../../../modules/product-type/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ProductTypeModuleService = req.scope.resolve(PRODUCT_TYPE_MODULE)

  const types = await service.listProductTypeTemplates(
    {},
    { order: { rank: "ASC" } }
  )
  const allOptions = await service.listProductTypeOptionTemplates(
    {},
    { order: { rank: "ASC" } }
  )
  const allFields = await service.listProductTypeDisclosureFields(
    {},
    { order: { sort_order: "ASC" } }
  )

  // 노드별 옵션 + 고시 묶기
  const decorate = (t: any) => ({
    id: t.id,
    parent_id: t.parent_id,
    name: t.name,
    disclosure_code: t.disclosure_code,
    rank: t.rank,
    options: allOptions
      .filter((o: any) => o.type_template_id === t.id)
      .map((o: any) => ({
        option_title: o.option_title,
        option_values: o.option_values,
        rank: o.rank,
      })),
    disclosure_fields: allFields
      .filter((f: any) => f.type_template_id === t.id)
      .map((f: any) => ({
        field_key: f.field_key,
        label: f.label,
        required: f.required,
        input_type: f.input_type,
        sort_order: f.sort_order,
      })),
  })

  // 트리 구성: 판매 분야(parent=null) → 분류(children)
  const fields = types.filter((t: any) => !t.parent_id)
  const product_types = fields.map((f: any) => ({
    ...decorate(f),
    children: types
      .filter((c: any) => c.parent_id === f.id)
      .map((c: any) => decorate(c)),
  }))

  res.json({ product_types })
}

type CreateBody = {
  name: string
  // 상위 분야 id — null/미지정이면 판매 분야(상품군), 값이 있으면 그 분야의 분류
  parent_id?: string | null
  disclosure_code?: string
  rank?: number
  options?: { option_title: string; option_values: string[]; rank?: number }[]
  // 분류 단위 고시 필수항목 정의
  disclosure_fields?: {
    field_key: string
    label: string
    required?: boolean
    input_type?: string
    sort_order?: number
  }[]
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ProductTypeModuleService = req.scope.resolve(PRODUCT_TYPE_MODULE)
  const body = req.body as CreateBody

  if (!body?.name?.trim()) {
    res.status(400).json({ message: "name 이 필요합니다." })
    return
  }

  const created = await service.createProductTypeTemplates({
    name: body.name.trim(),
    parent_id: body.parent_id ?? null,
    disclosure_code: body.disclosure_code ?? null,
    rank: body.rank ?? 0,
  })
  const type = Array.isArray(created) ? created[0] : created

  if (body.options?.length) {
    await service.createProductTypeOptionTemplates(
      body.options.map((o) => ({
        type_template_id: type.id,
        option_title: o.option_title,
        option_values: o.option_values as unknown as Record<string, unknown>,
        rank: o.rank ?? 0,
      }))
    )
  }

  if (body.disclosure_fields?.length) {
    await service.createProductTypeDisclosureFields(
      body.disclosure_fields.map((f, i) => ({
        type_template_id: type.id,
        field_key: f.field_key,
        label: f.label,
        required: f.required ?? true,
        input_type: f.input_type ?? "text",
        sort_order: f.sort_order ?? i,
      }))
    )
  }

  res.status(201).json({ product_type: type })
}

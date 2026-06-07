/**
 * 카테고리 ↔ 옵션템플릿 매핑 Admin API
 *
 *  - GET  /admin/category-option-map?category_id=<id>
 *      특정 카테고리에 매핑된 옵션템플릿 목록 + 각 옵션템플릿 상세 반환
 *      (option-template 상세는 product-type 모듈에서 조회)
 *
 *  - POST /admin/category-option-map
 *      카테고리에 옵션템플릿 매핑 추가
 *      Body: { category_id: string, option_tmpl_id: string, sort_order?: number }
 *
 *  - DELETE /admin/category-option-map/:id
 *      매핑 1건 삭제 → [id]/route.ts 에서 처리
 *
 * 설계 원칙:
 *  - Medusa 코어 카테고리 / product-type 모듈 미수정
 *  - 두 축을 이 매핑 테이블로만 연결
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATEGORY_OPTION_MAP_MODULE } from "../../../modules/category-option-map"
import CategoryOptionMapModuleService from "../../../modules/category-option-map/service"
import { PRODUCT_TYPE_MODULE } from "../../../modules/product-type"
import ProductTypeModuleService from "../../../modules/product-type/service"

/** GET /admin/category-option-map?category_id=<id> */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const mapService = req.scope.resolve(CATEGORY_OPTION_MAP_MODULE) as unknown as CategoryOptionMapModuleService
  const ptService = req.scope.resolve(PRODUCT_TYPE_MODULE) as unknown as ProductTypeModuleService

  const categoryId = req.query.category_id as string | undefined

  if (!categoryId?.trim()) {
    res.status(400).json({ message: "category_id 쿼리 파라미터가 필요합니다." })
    return
  }

  // 카테고리에 매핑된 레코드 조회
  const maps = await mapService.listByCategoryId(categoryId.trim())

  // 매핑된 옵션템플릿 id 목록으로 상세 조회
  const optionTmplIds = maps.map((m: any) => m.option_tmpl_id)
  const options = optionTmplIds.length
    ? await ptService.listProductTypeOptionTemplates(
        { id: optionTmplIds } as Record<string, unknown>,
        { order: { rank: "ASC" } }
      )
    : []

  // 옵션 상세를 id로 색인
  const optionMap = new Map(options.map((o: any) => [o.id, o]))

  // 매핑 + 옵션 상세 병합 (sort_order 순)
  const result = maps.map((m: any) => ({
    map_id: m.id,
    category_id: m.category_id,
    option_tmpl_id: m.option_tmpl_id,
    sort_order: m.sort_order,
    option: optionMap.get(m.option_tmpl_id) ?? null,
  }))

  res.json({ category_option_maps: result, count: result.length })
}

type PostBody = {
  category_id: string
  option_tmpl_id: string
  sort_order?: number
}

/** POST /admin/category-option-map */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const mapService = req.scope.resolve(CATEGORY_OPTION_MAP_MODULE) as unknown as CategoryOptionMapModuleService
  const body = req.body as PostBody

  if (!body?.category_id?.trim() || !body?.option_tmpl_id?.trim()) {
    res.status(400).json({ message: "category_id 와 option_tmpl_id 가 필요합니다." })
    return
  }

  // 중복 체크 — 같은 (category_id, option_tmpl_id) 가 이미 있으면 409
  const existing = await mapService.listCategoryOptionMaps({
    category_id: body.category_id.trim(),
    option_tmpl_id: body.option_tmpl_id.trim(),
  } as Record<string, unknown>)

  if (existing.length > 0) {
    res.status(409).json({ message: "이미 매핑된 옵션템플릿입니다." })
    return
  }

  const created = await mapService.createCategoryOptionMaps([
    {
      category_id: body.category_id.trim(),
      option_tmpl_id: body.option_tmpl_id.trim(),
      sort_order: body.sort_order ?? 0,
    },
  ])

  const map = Array.isArray(created) ? created[0] : created
  res.status(201).json({ category_option_map: map })
}

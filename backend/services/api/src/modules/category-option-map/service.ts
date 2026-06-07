/**
 * 카테고리 ↔ 옵션템플릿 매핑 모듈 서비스
 *
 * MedusaService 팩토리가 CRUD 메서드를 자동 생성한다.
 *  - createCategoryOptionMaps / listCategoryOptionMaps / deleteCategoryOptionMaps 등
 *
 * 편의 메서드: listByCategoryId — 특정 카테고리의 매핑 목록을 sort_order 오름차순 조회.
 */
import { MedusaService } from "@medusajs/framework/utils"
import CategoryOptionMap from "./models/category-option-map"

class CategoryOptionMapModuleService extends MedusaService({
  CategoryOptionMap,
}) {
  /** 특정 카테고리에 매핑된 옵션템플릿 id 목록을 sort_order 오름차순으로 조회 */
  async listByCategoryId(categoryId: string) {
    return this.listCategoryOptionMaps(
      { category_id: categoryId },
      { order: { sort_order: "ASC" } }
    )
  }

  /** 여러 카테고리에 대한 매핑 일괄 조회 (category_id[] → Map<categoryId, 매핑[]>) */
  async listByCategoryIds(categoryIds: string[]): Promise<Map<string, typeof CategoryOptionMap[]>> {
    if (!categoryIds.length) return new Map()
    // MedusaService의 listCategoryOptionMaps 는 IN 연산자를 지원함
    const maps = await this.listCategoryOptionMaps(
      { category_id: categoryIds } as Record<string, unknown>,
      { order: { sort_order: "ASC" } }
    )
    const result = new Map<string, (typeof maps)[number][]>()
    for (const m of maps) {
      const arr = result.get(m.category_id) ?? []
      arr.push(m)
      result.set(m.category_id, arr)
    }
    return result as unknown as Map<string, typeof CategoryOptionMap[]>
  }
}

export default CategoryOptionMapModuleService

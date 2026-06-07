/**
 * 상품유형 모듈 서비스
 *
 * ProductTypeTemplate / ProductTypeOptionTemplate 의 CRUD 메서드는 MedusaService 팩토리가
 * 자동 생성한다(createProductTypeTemplates · listProductTypeTemplates 등).
 * 그 위에 "유형 목록 + 각 유형의 옵션" 을 함께 조회하는 편의 메서드를 추가한다.
 */
import { MedusaService } from "@medusajs/framework/utils"
import ProductTypeTemplate from "./models/product-type-template"
import ProductTypeOptionTemplate from "./models/product-type-option-template"
import ProductTypeDisclosureField from "./models/product-type-disclosure-field"

class ProductTypeModuleService extends MedusaService({
  ProductTypeTemplate,
  ProductTypeOptionTemplate,
  ProductTypeDisclosureField,
}) {
  /** 특정 상품유형의 옵션 템플릿을 rank 오름차순으로 조회 */
  async listOptionsByType(typeTemplateId: string) {
    return this.listProductTypeOptionTemplates(
      { type_template_id: typeTemplateId },
      { order: { rank: "ASC" } }
    )
  }
}

export default ProductTypeModuleService

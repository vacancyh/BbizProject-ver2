/**
 * 상품군→분류 시드 스크립트 (2단 계층)
 *
 * - 판매 분야(상품군, parent=null): 의류 / 잡화  ← 쇼핑몰 관리에서 "판매할 것"
 * - 분류(parent=분야): 상의·하의·벨트·모자 / 가방·신발·악세서리
 * - 옵션 템플릿 + 상품정보고시 필수항목 = 분류 단위 (분류에 따라 옵션 변경)
 *
 * 실행: npx medusa exec ./src/scripts/seed-product-types.ts
 * 멱등: 기존 상품군/분류/옵션/고시 전체 삭제 후 재생성.
 */
import { ExecArgs } from "@medusajs/framework/types"
import { PRODUCT_TYPE_MODULE } from "../modules/product-type"
import ProductTypeModuleService from "../modules/product-type/service"

type DField = { key: string; label: string; required: boolean; input?: string }
type Cls = {
  name: string
  disclosure_code: string
  options: { title: string; values: string[] }[]
  fields: DField[]
}

// 고시 필드 묶음
const F_CLOTHING: DField[] = [
  { key: "material", label: "제품 소재(섬유 조성)", required: true },
  { key: "size_spec", label: "치수", required: true },
  { key: "manufacturer", label: "제조자/수입자", required: true },
  { key: "origin", label: "제조국", required: true },
  { key: "care", label: "세탁방법 및 취급 시 주의사항", required: true, input: "textarea" },
  { key: "warranty", label: "품질보증기준", required: true, input: "textarea" },
  { key: "as_contact", label: "A/S 책임자 및 전화번호", required: true },
]
const F_FASHION: DField[] = [
  { key: "kind", label: "종류", required: true },
  { key: "material", label: "소재", required: true },
  { key: "size_spec", label: "치수", required: false },
  { key: "manufacturer", label: "제조자/수입자", required: true },
  { key: "origin", label: "제조국", required: true },
  { key: "warranty", label: "품질보증기준", required: true, input: "textarea" },
  { key: "as_contact", label: "A/S 책임자 및 전화번호", required: true },
]
const F_SHOES: DField[] = [
  { key: "material", label: "제품 주소재", required: true },
  { key: "size_spec", label: "치수", required: true },
  { key: "manufacturer", label: "제조자/수입자", required: true },
  { key: "origin", label: "제조국", required: true },
  { key: "warranty", label: "품질보증기준", required: true, input: "textarea" },
  { key: "as_contact", label: "A/S 책임자 및 전화번호", required: true },
]
const F_ACCESSORY: DField[] = [
  { key: "material", label: "소재/재질(순도·중량)", required: true },
  { key: "size_spec", label: "치수", required: true },
  { key: "manufacturer", label: "제조자/수입자", required: true },
  { key: "origin", label: "제조국", required: true },
  { key: "warranty", label: "품질보증기준", required: true, input: "textarea" },
  { key: "as_contact", label: "A/S 책임자 및 전화번호", required: true },
]

// 판매 분야(상품군) → 분류 트리
const TREE: { field: string; classes: Cls[] }[] = [
  {
    field: "의류",
    classes: [
      {
        name: "상의",
        disclosure_code: "clothing",
        options: [
          { title: "사이즈", values: ["S", "M", "L", "XL", "Free"] },
          { title: "색상", values: ["블랙", "화이트", "그레이", "네이비", "베이지"] },
        ],
        fields: F_CLOTHING,
      },
      {
        name: "하의",
        disclosure_code: "clothing",
        options: [
          { title: "사이즈", values: ["28", "30", "32", "34", "36"] },
          { title: "색상", values: ["블랙", "그레이", "네이비", "베이지"] },
        ],
        fields: F_CLOTHING,
      },
      {
        name: "벨트",
        disclosure_code: "fashion",
        options: [
          { title: "길이", values: ["85cm", "90cm", "95cm", "100cm", "105cm"] },
          { title: "색상", values: ["블랙", "브라운"] },
        ],
        fields: F_FASHION,
      },
      {
        name: "모자",
        disclosure_code: "fashion",
        options: [{ title: "사이즈", values: ["Free", "S", "M", "L"] }],
        fields: F_FASHION,
      },
    ],
  },
  {
    field: "잡화",
    classes: [
      {
        name: "가방",
        disclosure_code: "fashion",
        options: [{ title: "색상", values: ["블랙", "브라운", "베이지"] }],
        fields: F_FASHION,
      },
      {
        name: "신발",
        disclosure_code: "shoes",
        options: [
          {
            title: "사이즈",
            values: ["230", "235", "240", "245", "250", "255", "260", "265", "270", "275", "280"],
          },
        ],
        fields: F_SHOES,
      },
      {
        name: "악세서리",
        disclosure_code: "accessory",
        options: [
          {
            title: "손가락 호수",
            values: ["5호", "6호", "7호", "8호", "9호", "10호", "11호", "12호", "13호", "14호", "15호"],
          },
        ],
        fields: F_ACCESSORY,
      },
    ],
  },
]

export default async function seedProductTypes({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const service: ProductTypeModuleService = container.resolve(PRODUCT_TYPE_MODULE)

  // 전체 wipe (멱등 — 시드 데이터만 존재)
  const allTypes = await service.listProductTypeTemplates({})
  const allOpts = await service.listProductTypeOptionTemplates({})
  const allFields = await service.listProductTypeDisclosureFields({})
  if (allOpts.length) await service.deleteProductTypeOptionTemplates(allOpts.map((o: any) => o.id))
  if (allFields.length) await service.deleteProductTypeDisclosureFields(allFields.map((f: any) => f.id))
  if (allTypes.length) await service.deleteProductTypeTemplates(allTypes.map((t: any) => t.id))
  logger.info(`기존 상품군/분류 정리: type ${allTypes.length} / opt ${allOpts.length} / field ${allFields.length}`)

  let fieldRank = 0
  for (const node of TREE) {
    // 판매 분야(상품군) — parent=null, 옵션/고시 없음
    const created = await service.createProductTypeTemplates({
      parent_id: null,
      name: node.field,
      disclosure_code: null,
      rank: fieldRank++,
    })
    const field = Array.isArray(created) ? created[0] : created
    logger.info(`판매 분야 생성: ${node.field} (${field.id})`)

    let clsRank = 0
    for (const cls of node.classes) {
      const c = await service.createProductTypeTemplates({
        parent_id: field.id,
        name: cls.name,
        disclosure_code: cls.disclosure_code,
        rank: clsRank++,
      })
      const cls_ = Array.isArray(c) ? c[0] : c

      await service.createProductTypeOptionTemplates(
        cls.options.map((o, i) => ({
          type_template_id: cls_.id,
          option_title: o.title,
          option_values: o.values as unknown as Record<string, unknown>,
          rank: i,
        }))
      )
      await service.createProductTypeDisclosureFields(
        cls.fields.map((f, i) => ({
          type_template_id: cls_.id,
          field_key: f.key,
          label: f.label,
          required: f.required,
          input_type: f.input ?? "text",
          sort_order: i,
        }))
      )
      logger.info(
        `  └ 분류: ${node.field} > ${cls.name} (옵션 ${cls.options.length} · 고시 ${cls.fields.length})`
      )
    }
  }

  logger.info("✅ 상품군→분류 시드 완료")
}

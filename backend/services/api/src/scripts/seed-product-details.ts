// 상품 상세 테스트값 보강 (2026-08-10 신설) — 재실행 안전(멱등)
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 시드된 상품은 이름·가격·이미지만 있고 **나머지가 비어 있었다.**
//   subtitle ∅ · material ∅ · 상품유형 ∅ · 태그 0개 · 상품고시 19건 중 2건
// 그래서 상품 상세 화면의 절반이 빈 칸으로 보이고, 무엇보다
// **번역이 제대로 걸리는지 확인할 대상 자체가 없었다**(번역 대상 필드가 비어 있으니).
//
// 이 스크립트는 화면 확인·번역 검증에 필요한 값을 전부 채운다.
// 실제 판매 문구가 아니라 **테스트값**이다 — 운영 전에 관리자에서 바꾼다.
//
// ── 실행 ────────────────────────────────────────────────────────────────────
//   npx medusa exec ./src/scripts/seed-product-details.ts
//
// ── 멱등 ────────────────────────────────────────────────────────────────────
// 이미 subtitle 이 채워진 상품은 건너뛴다. 태그·유형·고시는 없을 때만 붙인다.
// (운영자가 관리자에서 고친 값을 이 스크립트가 덮어쓰면 안 된다)
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * 상품별 상세값.
 *
 * key 는 **상품명(한국어 원문)** 이다 — handle 은 `kr-test-p3` 처럼 순번이라
 * 어떤 상품인지 읽어서 알 수 없고, 시드 순서가 바뀌면 엉뚱한 상품에 붙는다.
 */
const DETAILS: Record<
  string,
  { subtitle: string; description: string; material: string; type: string; category: string; tags: string[] }
> = {
  "베이직 코튼 티셔츠": {
    subtitle: "매일 입는 20수 코튼 반팔",
    description:
      "20수 코튼 원단으로 만든 기본 반팔 티셔츠입니다. 적당한 두께감으로 비침이 적고, 목 부분에 시보리 처리를 더해 여러 번 세탁해도 늘어짐이 덜합니다. 어깨선이 과하지 않은 레귤러 핏이라 단독으로도, 이너로도 무난하게 입을 수 있습니다.",
    material: "면 100%",
    type: "의류",
    category: "상의",
    tags: ["베스트"],
  },
  "오버핏 맨투맨": {
    subtitle: "어깨가 편한 기모 맨투맨",
    description:
      "안감에 기모를 넣어 쌀쌀한 날에도 따뜻한 오버핏 맨투맨입니다. 어깨선을 넉넉하게 내려 팔 움직임이 편하고, 밑단과 소매에 탄탄한 시보리를 넣어 형태가 오래 유지됩니다.",
    material: "면 80%, 폴리에스터 20%",
    type: "의류",
    category: "상의",
    tags: ["신상", "베스트"],
  },
  "슬림 데님 팬츠": {
    subtitle: "다리 라인이 사는 스트레치 데님",
    description:
      "신축성 있는 스판 데님으로 앉거나 걸을 때 불편함이 적습니다. 허벅지에서 발목으로 자연스럽게 좁아지는 슬림 핏이며, 밑단은 접어 입어도 모양이 잡힙니다.",
    material: "면 98%, 폴리우레탄 2%",
    type: "의류",
    category: "하의",
    tags: ["베스트"],
  },
  "구스다운 패딩": {
    subtitle: "덕다운 80% 경량 패딩",
    description:
      "충전재로 덕다운 80%·페더 20%를 사용해 가볍지만 보온이 좋습니다. 겉감은 발수 가공을 해 가벼운 눈비에 대응하며, 목 부분과 소매 안쪽에 바람막이를 넣었습니다.",
    material: "겉감 나일론 100% / 충전재 덕다운 80%, 페더 20%",
    type: "의류",
    category: "아우터",
    tags: ["베스트", "한정"],
  },
  "린넨 셔츠": {
    subtitle: "여름에 시원한 마 혼방 셔츠",
    description:
      "마 55%를 섞어 통기성이 좋은 여름용 셔츠입니다. 린넨 특유의 구김은 소재 특성이며, 세탁 후 가볍게 털어 널면 대부분 펴집니다.",
    material: "마 55%, 면 45%",
    type: "의류",
    category: "상의",
    tags: ["친환경"],
  },
  "니트 가디건": {
    subtitle: "간절기에 걸치기 좋은 브이넥",
    description:
      "울을 섞어 짜 부드럽고 형태가 잘 잡히는 브이넥 가디건입니다. 얇지 않은 게이지라 봄가을 겉옷으로도, 겨울 이너로도 쓸 수 있습니다.",
    material: "아크릴 70%, 울 30%",
    type: "의류",
    category: "아우터",
    tags: ["신상"],
  },
  "조거 트레이닝 팬츠": {
    subtitle: "발목 시보리 기모 조거",
    description:
      "안감 기모로 따뜻하고, 발목 시보리가 있어 활동할 때 바지가 흘러내리지 않습니다. 허리는 밴딩과 끈을 함께 넣어 사이즈 조절이 됩니다. 양옆 주머니는 깊게 만들어 휴대폰이 안정적으로 들어갑니다.",
    material: "면 60%, 폴리에스터 40%",
    type: "의류",
    category: "하의",
    tags: ["세일"],
  },
  "후드 집업": {
    subtitle: "가볍게 걸치는 코튼 후드",
    description:
      "지퍼가 끝까지 올라가는 코튼 후드 집업입니다. 모자에 두 겹 원단을 써 눌리지 않고, 주머니는 손이 편히 들어가는 캥거루 형태입니다.",
    material: "면 100%",
    type: "의류",
    category: "상의",
    tags: ["신상", "베스트"],
  },
  "셔츠 원피스": {
    subtitle: "허리끈으로 실루엣 조절",
    description:
      "함께 오는 허리끈으로 실루엣을 바꿔 입을 수 있는 셔츠형 원피스입니다. 묶으면 허리선이 잡히고, 풀면 여유 있는 박시 핏이 됩니다. 무릎을 살짝 덮는 기장입니다.",
    material: "폴리에스터 65%, 레이온 35%",
    type: "의류",
    category: "상의",
    tags: ["신상"],
  },
  "울 코트": {
    subtitle: "울 60% 싱글 브레스티드",
    description:
      "울을 60% 섞어 겨울에 입기에 충분한 두께를 가진 싱글 코트입니다. 안감을 전체에 넣어 니트 위에 입어도 걸리지 않고, 무릎 위 기장이라 활동하기 편합니다.",
    material: "울 60%, 폴리에스터 40%",
    type: "의류",
    category: "아우터",
    tags: ["한정"],
  },
  "스니커즈": {
    subtitle: "어디에나 어울리는 데일리 화이트",
    description:
      "군더더기 없는 화이트 로우탑 스니커즈입니다. 인솔에 쿠션을 넣어 오래 걸어도 발바닥 피로가 덜하고, 아웃솔은 미끄럼에 강한 러버를 썼습니다.",
    material: "겉면 인조가죽 / 아웃솔 러버",
    type: "신발",
    category: "신발",
    tags: ["베스트"],
  },
  "캔버스 토트백": {
    subtitle: "노트북이 들어가는 두꺼운 캔버스",
    description:
      "14인치 노트북이 들어가는 크기의 캔버스 토트백입니다. 12온스 두꺼운 원단이라 짐을 넣어도 형태가 무너지지 않고, 안쪽에 지퍼 포켓이 하나 있습니다.",
    material: "면 100% (12온스 캔버스)",
    type: "가방",
    category: "액세서리",
    tags: ["친환경"],
  },
  "가죽 벨트": {
    subtitle: "소가죽 3.5cm 데일리 벨트",
    description:
      "소가죽을 사용한 폭 3.5cm 벨트입니다. 정장과 캐주얼 모두에 무난한 폭이며, 버클은 무광 처리해 눈에 튀지 않습니다.",
    material: "소가죽 100%",
    type: "액세서리",
    category: "액세서리",
    tags: [],
  },
  "비니 모자": {
    subtitle: "귀까지 덮이는 골지 니트",
    description:
      "접어 쓰면 이마까지, 펴서 쓰면 귀까지 덮이는 골지 니트 비니입니다. 늘어남이 적은 조직이라 오래 써도 헐거워지지 않습니다.",
    material: "아크릴 100%",
    type: "패션소품",
    category: "액세서리",
    tags: ["세일"],
  },
  "크루삭스 3팩": {
    subtitle: "발목 위로 오는 기본 3켤레",
    description:
      "발목 위로 올라오는 기본 크루 길이 양말 3켤레 구성입니다. 발바닥에 파일 조직을 넣어 쿠션감이 있고, 발목 밴드는 조임이 세지 않습니다.",
    material: "면 75%, 폴리에스터 22%, 폴리우레탄 3%",
    type: "패션소품",
    category: "액세서리",
    tags: ["세일"],
  },
}

/**
 * 상품별 고시 템플릿(`product_type_template.name`).
 *
 * ⚠️ "의류"·"잡화" 템플릿에는 **고시 항목이 정의돼 있지 않다.** 그걸 쓰면
 * 항목 0개짜리 고시가 만들어져 화면에 아무것도 안 뜬다. 항목이 있는 것만 쓴다.
 */
const TEMPLATE_BY_PRODUCT: Record<string, string> = {
  "베이직 코튼 티셔츠": "상의",
  "오버핏 맨투맨": "상의",
  "후드 집업": "상의",
  "린넨 셔츠": "상의",
  "니트 가디건": "상의",
  "셔츠 원피스": "상의",
  "울 코트": "상의",
  "구스다운 패딩": "상의",
  "슬림 데님 팬츠": "하의",
  "조거 트레이닝 팬츠": "하의",
  "스니커즈": "신발",
  "캔버스 토트백": "가방",
  "가죽 벨트": "벨트",
  "비니 모자": "모자",
  "크루삭스 3팩": "악세서리",
}

/**
 * 고시 항목 값 — **field_key 기준**으로 채운다.
 *
 * 관리자 화면이 `field_key` 로 저장하므로 시드도 같은 형태여야 한다.
 * (구 시드는 한글 항목명을 키로 써서 관리자에서 열면 입력칸이 전부 비어 보였다)
 * 항목명은 템플릿의 label 을 store 라우트가 붙여 준다.
 */
function disclosureValue(
  fieldKey: string,
  name: string,
  d: (typeof DETAILS)[string]
): string {
  switch (fieldKey) {
    case "kind":
      return d.type
    case "material":
      return d.material
    case "size_spec":
      if (d.type === "신발") return "230 / 240 / 250 / 260 / 270 / 280 mm"
      if (d.type === "가방") return "가로 38 × 세로 40 × 폭 12 cm"
      if (d.type === "액세서리") return "폭 3.5cm · 길이 100~115cm"
      if (d.type === "패션소품") return "FREE"
      return "S / M / L"
    case "manufacturer":
      return "비즈샵(주) / 자체 제작"
    case "origin":
      return "대한민국"
    case "care":
      return "30℃ 이하 찬물 단독 세탁, 표백제 사용 금지, 그늘에 뉘어 건조"
    case "warranty":
      return "관련 법 및 소비자분쟁해결기준에 따름"
    case "as_contact":
      return "비즈샵 고객센터 1588-0000"
    default:
      // 템플릿에 새 항목이 추가돼도 빈 칸으로 남지 않게 한다
      return `${name} 상세 이미지 참조`
  }
}

export default async function seedProductDetails({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT) as any

  // ── 상품유형·태그 id 확보 (없으면 만든다) ─────────────────────────────────
  const wantedTypes = [...new Set(Object.values(DETAILS).map((d) => d.type))]
  const wantedTags = [...new Set(Object.values(DETAILS).flatMap((d) => d.tags))]

  const existingTypes: any[] = await productModule.listProductTypes({ value: wantedTypes })
  const typeId = new Map<string, string>(existingTypes.map((t) => [t.value, t.id]))
  const missingTypes = wantedTypes.filter((v) => !typeId.has(v))
  if (missingTypes.length) {
    const made = await productModule.createProductTypes(missingTypes.map((value) => ({ value })))
    for (const t of made) typeId.set(t.value, t.id)
    logger.info(`[details] 상품유형 생성: ${missingTypes.join(", ")}`)
  }

  const existingTags: any[] = await productModule.listProductTags({ value: wantedTags })
  const tagId = new Map<string, string>(existingTags.map((t) => [t.value, t.id]))
  const missingTags = wantedTags.filter((v) => !tagId.has(v))
  if (missingTags.length) {
    const made = await productModule.createProductTags(missingTags.map((value) => ({ value })))
    for (const t of made) tagId.set(t.value, t.id)
    logger.info(`[details] 상품태그 생성: ${missingTags.join(", ")}`)
  }

  // ── 대상 상품 조회 ────────────────────────────────────────────────────────
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "subtitle", "description", "material", "type_id", "tags.id"],
    filters: { title: Object.keys(DETAILS) },
  })

  let updated = 0
  let skipped = 0
  for (const p of products as any[]) {
    const d = DETAILS[p.title]
    if (!d) continue

    // 이미 부제가 있으면 사람이 손댄 것으로 보고 건드리지 않는다
    if (p.subtitle && String(p.subtitle).trim()) {
      skipped++
      continue
    }

    const tagIds = d.tags.map((t) => tagId.get(t)).filter(Boolean) as string[]
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: p.id },
        update: {
          subtitle: d.subtitle,
          description: d.description,
          material: d.material,
          type_id: typeId.get(d.type),
          // ⚠️ `tag_ids` 는 없는 속성이다("Entity 'Product' does not have property 'tag_ids'").
          // 태그는 객체 배열로 넘긴다.
          ...(tagIds.length ? { tags: tagIds.map((id) => ({ id })) } : {}),
        },
      },
    })
    updated++
    logger.info(`[details]   ✓ ${p.title} — 부제·설명·소재·유형(${d.type})·태그 ${tagIds.length}개`)
  }
  logger.info(`[details] 상품 상세 — 보강 ${updated} · 유지 ${skipped}`)

  // ── 카테고리 재배정 ───────────────────────────────────────────────────────
  // 기존 시드는 카테고리를 **순번 나머지(index % 5)로** 붙였다. 그래서
  //   구스다운 패딩 → 신발 · 캔버스 토트백 → 하의 · 스니커즈 → 상의
  // 처럼 엉뚱하게 묶여 카테고리 탐색이 말이 안 됐다(양 언어 공통).
  // 부제 보강과 달리 **이미 값이 있어도 고친다** — 잘못된 값을 그대로 두면 안 된다.
  const { data: cats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const catId = new Map<string, string>((cats as any[]).map((c) => [c.name, c.id]))

  const { data: withCats } = await query.graph({
    entity: "product",
    fields: ["id", "title", "categories.id", "categories.name"],
    filters: { title: Object.keys(DETAILS) },
  })

  let moved = 0
  for (const p of withCats as any[]) {
    const want = DETAILS[p.title]?.category
    const wantId = want ? catId.get(want) : undefined
    if (!wantId) continue

    const has = (p.categories ?? []).map((c: any) => c.id)
    if (has.length === 1 && has[0] === wantId) continue

    await updateProductsWorkflow(container).run({
      // 타입상 필드명은 `category_ids` 다(`categories` 는 없는 속성이라 컴파일이 막힌다).
      input: { selector: { id: p.id }, update: { category_ids: [wantId] } },
    })
    moved++
    const before = (p.categories ?? []).map((c: any) => c.name).join(",") || "∅"
    logger.info(`[details]   ↻ ${p.title} — 카테고리 ${before} → ${want}`)
  }
  logger.info(`[details] 카테고리 — 재배정 ${moved} · 유지 ${(withCats as any[]).length - moved}`)

  // ── 상품고시 ──────────────────────────────────────────────────────────────
  // 커스텀 모듈이라 없으면 조용히 넘어간다(이 단계가 실패해도 나머지는 유효하다).
  let disclosureSvc: any
  try {
    disclosureSvc = container.resolve("productDisclosure")
  } catch {
    logger.warn("[details] 상품고시 모듈 없음 — 고시 시드를 건너뜁니다")
    return
  }

  const typeSvc = container.resolve("productType") as any
  const templates: any[] = await typeSvc.listProductTypeTemplates({})
  const templateByName = new Map<string, string>(templates.map((t) => [t.name, t.id]))

  const existing: any[] = await disclosureSvc.listProductDisclosures({})
  const hasDisclosure = new Set(existing.map((x) => x.product_id))

  const toCreate: any[] = []
  for (const p of products as any[]) {
    const d = DETAILS[p.title]
    if (!d || hasDisclosure.has(p.id)) continue

    const templateId = templateByName.get(TEMPLATE_BY_PRODUCT[p.title] ?? "")
    if (!templateId) {
      logger.warn(`[details] 고시 템플릿 없음 — ${p.title} 건너뜀`)
      continue
    }

    const defs: any[] = await typeSvc.listProductTypeDisclosureFields(
      { type_template_id: templateId },
      { order: { sort_order: "ASC" } }
    )
    if (!defs.length) {
      logger.warn(`[details] 고시 항목이 정의되지 않은 템플릿 — ${p.title} 건너뜀`)
      continue
    }

    const values: Record<string, string> = {}
    for (const f of defs) values[f.field_key] = disclosureValue(f.field_key, p.title, d)

    toCreate.push({
      product_id: p.id,
      type_template_id: templateId,
      version: 1,
      status: "published",
      published_at: new Date(),
      // 모델이 text 라 문자열로 넣어야 한다(store 라우트가 JSON.parse 한다)
      fields_json: JSON.stringify(values),
    })
  }

  if (!toCreate.length) {
    logger.info(`[details] 상품고시 — 이미 ${hasDisclosure.size}건, 추가 없음`)
    return
  }
  await disclosureSvc.createProductDisclosures(toCreate)
  logger.info(`[details] 상품고시 — ${toCreate.length}건 생성 (기존 ${hasDisclosure.size}건)`)
}

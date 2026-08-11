// 콘텐츠 영어 번역 시드 (2026-08-10 신설) — 재실행 안전(멱등)
//
// ── 무엇을 넣나 ─────────────────────────────────────────────────────────────
// **운영자가 관리자에서 입력하는 콘텐츠**의 en-US 번역 기본값이다.
//   상품(이름·부제·설명·소재) · 카테고리 · 컬렉션 · 옵션 · 옵션값 · 유형 · 태그
//   · 배송방법 · 배너 · 공지 · FAQ
//
// 화면의 버튼·안내문 같은 **UI 라벨은 여기 대상이 아니다.**
// 그건 코드(`apps/web/src/lib/i18n/messages.ts`)에서 관리한다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 번역 기능은 만들어 뒀지만 **넣어 둔 번역이 없어서**, 영어로 바꿔도 상품명·카테고리가
// 전부 한국어로 나왔다. 솔루션을 넘길 때 "되긴 되는데 보여줄 게 없는" 상태였다.
// 여기 값은 실제 판매 문구가 아니라 **확인용 기본값**이다 — 운영자가 관리자에서 고친다.
//
// ── 실행 ────────────────────────────────────────────────────────────────────
//   npx medusa exec ./src/scripts/seed-content-en.ts
//
//   이미 번역이 있으면 덮어쓰지 않는다(운영자 수정본 보호).
//   기본값으로 되돌리려면: SEED_EN_OVERWRITE=true npx medusa exec ./src/scripts/seed-content-en.ts
//
// ── 정리도 같이 한다 ────────────────────────────────────────────────────────
// E2E·프로브가 남긴 쓰레기 번역("QA English Title 1785…", "PROBE …", 공백만 든 것)을 지운다.
// 이건 **고객 화면에 상품명으로 그대로 보인다.** 실제로 보이고 있었다.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const LOCALE = "en-US"
const OVERWRITE = process.env.SEED_EN_OVERWRITE === "true"

/** 자동화가 남긴 흔적. 이 패턴에 걸리는 번역은 지운다. */
const JUNK = /^(PROBE |QA English|DEBUG |E2E )/

/**
 * 원문(한국어) → 영어.
 *
 * 원문을 키로 쓰는 이유: id 는 환경마다 다르고, handle 은 `kr-test-p7` 처럼
 * 순번이라 **어떤 상품인지 읽어서 알 수 없다.** 원문이 가장 안전하고 검토하기 쉽다.
 * 같은 이름이 여러 건이면 전부 같은 번역이 붙는다(의도된 동작).
 */
type FieldMap = Record<string, Record<string, string>>

/** 상품: title / subtitle / description / material */
const PRODUCTS: FieldMap = {
  "베이직 코튼 티셔츠": {
    title: "Basic Cotton T-Shirt",
    subtitle: "Everyday 20s-count cotton tee",
    description:
      "A basic short-sleeve tee made from 20s-count cotton. Thick enough to avoid see-through, with ribbed neckline trim that resists stretching after repeated washes. The regular fit keeps the shoulder line modest, so it works on its own or as a layer.",
    material: "100% Cotton",
  },
  "오버핏 맨투맨": {
    title: "Oversized Sweatshirt",
    subtitle: "Brushed fleece with a relaxed shoulder",
    description:
      "An oversized sweatshirt lined with brushed fleece for chilly days. The dropped shoulder gives the arms room to move, and sturdy ribbing at the hem and cuffs holds the shape over time.",
    material: "80% Cotton, 20% Polyester",
  },
  "슬림 데님 팬츠": {
    title: "Slim Denim Pants",
    subtitle: "Stretch denim that follows the leg line",
    description:
      "Stretch denim that stays comfortable when you sit or walk. The slim fit tapers naturally from the thigh to the ankle, and the hem holds its shape even when cuffed.",
    material: "98% Cotton, 2% Polyurethane",
  },
  "구스다운 패딩": {
    title: "Goose Down Puffer",
    subtitle: "80% down fill, lightweight warmth",
    description:
      "Filled with 80% duck down and 20% feather — light to wear but warm. The shell is water-repellent for light rain or snow, with wind guards at the collar and inner cuffs.",
    material: "Shell 100% Nylon / Fill 80% Down, 20% Feather",
  },
  "린넨 셔츠": {
    title: "Linen Shirt",
    subtitle: "Breathable linen blend for summer",
    description:
      "A summer shirt blended with 55% linen for breathability. The characteristic linen creasing is inherent to the fabric — shake it out and hang it after washing and most of it falls away.",
    material: "55% Linen, 45% Cotton",
  },
  "니트 가디건": {
    title: "Knit Cardigan",
    subtitle: "V-neck layer for the in-between seasons",
    description:
      "A wool-blend V-neck cardigan, soft and shape-retaining. The gauge is substantial enough to wear as outerwear in spring and autumn, or as a layer in winter.",
    material: "70% Acrylic, 30% Wool",
  },
  "조거 트레이닝 팬츠": {
    title: "Jogger Track Pants",
    subtitle: "Fleece-lined with ribbed ankles",
    description:
      "Fleece-lined for warmth, with ribbed ankle cuffs that keep the legs from riding down while you move. The waist has both elastic and a drawcord for adjustment, and the deep side pockets hold a phone securely.",
    material: "60% Cotton, 40% Polyester",
  },
  "후드 집업": {
    title: "Hooded Zip-Up",
    subtitle: "An easy cotton layer",
    description:
      "A cotton zip-up hoodie with a full-length zipper. The hood is double-layered so it holds its shape, and the kangaroo pocket is roomy enough for both hands.",
    material: "100% Cotton",
  },
  "셔츠 원피스": {
    title: "Shirt Dress",
    subtitle: "Belt it or leave it loose",
    description:
      "A shirt dress that changes silhouette with the included belt — cinch it for a defined waist, or leave it off for a relaxed boxy fit. The hem falls just below the knee.",
    material: "65% Polyester, 35% Rayon",
  },
  "울 코트": {
    title: "Wool Coat",
    subtitle: "60% wool, single-breasted",
    description:
      "A single-breasted coat with 60% wool, substantial enough for winter. Fully lined so it glides over knitwear, and cut above the knee for ease of movement.",
    material: "60% Wool, 40% Polyester",
  },
  "스니커즈": {
    title: "Sneakers",
    subtitle: "White low-tops that go with anything",
    description:
      "Clean white low-top sneakers with no unnecessary detail. A cushioned insole reduces foot fatigue on long walks, and the rubber outsole grips well.",
    material: "Upper: Synthetic Leather / Outsole: Rubber",
  },
  "캔버스 토트백": {
    title: "Canvas Tote Bag",
    subtitle: "Heavy canvas that fits a laptop",
    description:
      "A canvas tote sized to fit a 14-inch laptop. The 12oz fabric keeps its shape under load, and there is one zippered pocket inside.",
    material: "100% Cotton (12oz Canvas)",
  },
  "가죽 벨트": {
    title: "Leather Belt",
    subtitle: "3.5cm cowhide, everyday width",
    description:
      "A 3.5cm-wide cowhide belt — a width that works with both tailoring and casual wear. The buckle has a matte finish so it stays understated.",
    material: "100% Cowhide",
  },
  "비니 모자": {
    title: "Beanie",
    subtitle: "Ribbed knit that covers the ears",
    description:
      "A ribbed knit beanie that sits at the forehead when cuffed and covers the ears when unrolled. The tight knit resists stretching out with wear.",
    material: "100% Acrylic",
  },
  "크루삭스 3팩": {
    title: "Crew Socks 3-Pack",
    subtitle: "Three pairs of above-the-ankle basics",
    description:
      "Three pairs of basic crew-length socks. A pile knit at the sole adds cushioning, and the ankle band grips without pinching.",
    material: "75% Cotton, 22% Polyester, 3% Polyurethane",
  },
}

/** 카테고리: name */
const CATEGORIES: FieldMap = {
  "상의": { name: "Tops", description: "T-shirts, shirts, sweatshirts and knitwear" },
  "하의": { name: "Bottoms", description: "Denim, slacks and track pants" },
  "아우터": { name: "Outerwear", description: "Coats, padded jackets and cardigans" },
  "신발": { name: "Shoes", description: "Sneakers and everyday footwear" },
  "액세서리": { name: "Accessories", description: "Bags, belts, hats and socks" },
}

/** 컬렉션: title */
const COLLECTIONS: FieldMap = {
  "베스트 상품": { title: "Best Sellers" },
  "신상품": { title: "New Arrivals" },
}

/** 상품유형: value */
const TYPES: FieldMap = {
  "의류": { value: "Apparel" },
  "신발": { value: "Footwear" },
  "가방": { value: "Bags" },
  "액세서리": { value: "Accessories" },
  "패션소품": { value: "Fashion Accessories" },
}

/** 상품태그: value */
const TAGS: FieldMap = {
  "신상": { value: "New" },
  "베스트": { value: "Best" },
  "세일": { value: "Sale" },
  "한정": { value: "Limited" },
  "친환경": { value: "Eco" },
}

/** 옵션명: title (옵션값 White/S/M/L 등은 이미 영문이라 번역 대상이 아니다) */
const OPTIONS: FieldMap = {
  "사이즈": { title: "Size" },
  "색상": { title: "Color" },
}

/** 배송방법: name — 결제 화면에 그대로 노출된다 */
const SHIPPING: FieldMap = {
  "기본 배송(국내)": { name: "Standard Shipping (Domestic)" },
  "제주/도서산간 추가배송": { name: "Jeju / Remote Area Surcharge" },
}

/** 배너: title */
const BANNERS: FieldMap = {
  "신상품 입고 — 지금 만나보세요": { title: "New Arrivals — Shop Now" },
  "베스트 아이템 모음": { title: "Best Sellers Collection" },
  "신규 회원 적립금 500원 지급": { title: "500 KRW reward for new members" },
  "겨울 시즌 오프 — 최대 50%": { title: "Winter Season Off — Up to 50%" },
  "오늘의 특가 타임세일": { title: "Today's Flash Sale" },
  "신규 가입 혜택 모음": { title: "New Member Benefits" },
  "주말 한정 무료배송 이벤트": { title: "Weekend-Only Free Shipping" },
}

/** 공지: title / body */
const NOTICES: FieldMap = {
  "[안내] 설 연휴 배송 일정 안내": {
    title: "[Notice] Lunar New Year shipping schedule",
    body: "Orders will ship in sequence during the Lunar New Year holiday (Feb 14–17). To ship before the holiday, please complete payment by Feb 13.",
  },
  "[공지] 개인정보처리방침 개정 안내": {
    title: "[Notice] Privacy Policy update",
    body: "Our Privacy Policy was revised effective January 1, 2026. Please see the Privacy Policy page in the footer for details.",
  },
  "[이벤트] 신규 회원 적립금 지급": {
    title: "[Event] Reward points for new members",
    body: "New members receive 500 KRW in reward points immediately. Check your balance under My Page > Reward Points.",
  },
}

/** FAQ: category / question / answer */
const FAQS: FieldMap = {
  "주문 후 결제수단을 변경할 수 있나요?": {
    category: "Orders & Payment",
    question: "Can I change my payment method after ordering?",
    answer:
      "If payment has not been completed, you can start again from your cart. To change it after payment, please contact customer service.",
  },
  "배송은 얼마나 걸리나요?": {
    category: "Shipping",
    question: "How long does shipping take?",
    answer:
      "Orders typically ship within 2–3 business days of payment. Remote and island areas may take 1–2 days longer.",
  },
  "교환·반품은 어떻게 신청하나요?": {
    category: "Returns & Exchanges",
    question: "How do I request a return or exchange?",
    answer:
      "You can request one within 7 days of delivery under My Page > Order History. For a change of mind, round-trip shipping is charged to the customer.",
  },
  "적립금은 어디서 확인하나요?": {
    category: "Membership & Points",
    question: "Where can I check my reward points?",
    answer:
      "Go to My Page > Reward Points to see your balance and the full history of points earned and used.",
  },
}

/** 번역 대상 한 묶음. `match` 는 원문을 뽑아 내는 필드명이다. */
type Group = {
  reference: string
  label: string
  /** 원문 레코드 목록을 가져온다 */
  load: (ctx: Ctx) => Promise<{ id: string; key: string }[]>
  map: FieldMap
}

type Ctx = { container: any; query: any }

const GROUPS: Group[] = [
  {
    reference: "product",
    label: "상품",
    map: PRODUCTS,
    load: async ({ query }) => rows(await graph(query, "product", ["id", "title"]), "title"),
  },
  {
    reference: "product_category",
    label: "카테고리",
    map: CATEGORIES,
    load: async ({ query }) =>
      rows(await graph(query, "product_category", ["id", "name"]), "name"),
  },
  {
    reference: "product_collection",
    label: "컬렉션",
    map: COLLECTIONS,
    load: async ({ query }) =>
      rows(await graph(query, "product_collection", ["id", "title"]), "title"),
  },
  {
    reference: "product_type",
    label: "상품유형",
    map: TYPES,
    load: async ({ query }) => rows(await graph(query, "product_type", ["id", "value"]), "value"),
  },
  {
    reference: "product_tag",
    label: "상품태그",
    map: TAGS,
    load: async ({ query }) => rows(await graph(query, "product_tag", ["id", "value"]), "value"),
  },
  {
    reference: "product_option",
    label: "옵션명",
    map: OPTIONS,
    load: async ({ query }) => rows(await graph(query, "product_option", ["id", "title"]), "title"),
  },
  {
    reference: "shipping_option",
    label: "배송방법",
    map: SHIPPING,
    load: async ({ query }) => rows(await graph(query, "shipping_option", ["id", "name"]), "name"),
  },
  {
    reference: "banner",
    label: "배너",
    map: BANNERS,
    load: async ({ container }) => {
      const svc = container.resolve("cms") as any
      return rows(await svc.listBanners({}), "title")
    },
  },
  {
    reference: "notice",
    label: "공지",
    map: NOTICES,
    load: async ({ container }) => {
      const svc = container.resolve("cms") as any
      return rows(await svc.listNotices({}), "title")
    },
  },
  {
    reference: "faq",
    label: "FAQ",
    map: FAQS,
    load: async ({ container }) => {
      const svc = container.resolve("cms") as any
      return rows(await svc.listFaqs({}), "question")
    },
  },
]

async function graph(query: any, entity: string, fields: string[]): Promise<any[]> {
  const { data } = await query.graph({ entity, fields })
  return data ?? []
}

function rows(list: any[], keyField: string): { id: string; key: string }[] {
  return (list ?? [])
    .filter((r) => r && r.id && r[keyField])
    .map((r) => ({ id: r.id, key: String(r[keyField]) }))
}

export default async function seedContentEn({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  let svc: any
  try {
    svc = container.resolve("translation")
  } catch {
    logger.error(
      "[en] 번역 모듈이 없습니다. medusa-config.ts 의 featureFlags.translation 과\n" +
        '  modules 의 { resolve: "@medusajs/translation" } 을 확인하세요.'
    )
    return
  }

  // ── 0. 쓰레기 번역 정리 ───────────────────────────────────────────────────
  // 자동화가 남긴 값들이다. 고객 화면에 **상품명으로 그대로 노출된다.**
  const all: any[] = await svc.listTranslations({}, { take: 10_000 })
  const junk = all.filter((t) => {
    const vals = Object.values((t.translations ?? {}) as Record<string, string>)
    if (!vals.length) return true // 필드가 하나도 없는 껍데기
    return vals.every((v) => !String(v ?? "").trim()) || vals.some((v) => JUNK.test(String(v)))
  })
  if (junk.length) {
    await svc.deleteTranslations(junk.map((t) => t.id))
    logger.info(`[en] 테스트 잔여 번역 ${junk.length}건 삭제`)
    for (const t of junk.slice(0, 10)) {
      logger.info(`[en]   - ${t.reference} ${JSON.stringify(t.translations)}`)
    }
  } else {
    logger.info("[en] 테스트 잔여 번역 없음")
  }

  // ── 1. 그룹별 번역 주입 ───────────────────────────────────────────────────
  const ctx: Ctx = { container, query }
  let created = 0
  let updated = 0
  let kept = 0
  const unmatched: string[] = []

  for (const g of GROUPS) {
    let records: { id: string; key: string }[]
    try {
      records = await g.load(ctx)
    } catch (e: any) {
      logger.warn(`[en] ${g.label} 조회 실패 — 건너뜀 (${e?.message})`)
      continue
    }

    // 이 그룹에 이미 저장된 en-US 번역
    const existing: any[] = await svc.listTranslations(
      { reference: g.reference, locale_code: LOCALE },
      { take: 10_000 }
    )
    const byRef = new Map(existing.map((t) => [t.reference_id, t]))

    let gCreated = 0
    let gUpdated = 0
    let gKept = 0
    const matchedKeys = new Set<string>()

    for (const r of records) {
      const en = g.map[r.key]
      if (!en) continue
      matchedKeys.add(r.key)

      const cur = byRef.get(r.id)
      if (cur) {
        // 운영자가 고친 값을 덮어쓰지 않는다
        if (!OVERWRITE) {
          gKept++
          continue
        }
        await svc.updateTranslations([{ id: cur.id, translations: en }])
        gUpdated++
        continue
      }
      await svc.createTranslations([
        { reference: g.reference, reference_id: r.id, locale_code: LOCALE, translations: en },
      ])
      gCreated++
    }

    // 사전에는 있는데 DB 에서 못 찾은 원문 — 오타이거나 데이터가 바뀐 것이다
    for (const k of Object.keys(g.map)) {
      if (!matchedKeys.has(k)) unmatched.push(`${g.label}: ${k}`)
    }

    created += gCreated
    updated += gUpdated
    kept += gKept
    logger.info(
      `[en] ${g.label.padEnd(6)} — 신규 ${gCreated} · 갱신 ${gUpdated} · 유지 ${gKept} (대상 ${records.length}건)`
    )
  }

  logger.info(`[en] 합계 — 신규 ${created} · 갱신 ${updated} · 유지 ${kept}`)
  if (unmatched.length) {
    logger.warn(
      `[en] 사전에 있으나 DB 에서 못 찾은 원문 ${unmatched.length}건:\n  ` + unmatched.join("\n  ")
    )
  }
  if (kept && !OVERWRITE) {
    logger.info("[en] 기존 번역은 그대로 뒀습니다. 기본값으로 덮으려면 SEED_EN_OVERWRITE=true")
  }
}

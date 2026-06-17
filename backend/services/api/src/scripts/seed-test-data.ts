// 테스트 데이터 시드 — 실제 구현된 워크플로우/커스텀 모듈 서비스를 그대로 호출.
// 실행: npx medusa exec ./src/scripts/seed-test-data.ts
// 생성: 카테고리 5 · 상품 15 · 고객 15 · 주문 15 · 리뷰 15 · 적립금 15건
// 재실행 안전: 동일 식별자(handle/email prefix) 존재 시 생성 단계를 건너뜀.
import { ExecArgs } from "@medusajs/framework/types"
import {
  createProductsWorkflow,
  createCustomersWorkflow,
  createOrderWorkflow,
  createProductCategoriesWorkflow,
  createCustomerGroupsWorkflow,
  linkCustomersToCustomerGroupWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const TAG = "kr-test"
const CUR = "eur" // 시드된 Europe 리전 통화

const KO_PRODUCTS = [
  "베이직 코튼 티셔츠", "오버핏 맨투맨", "슬림 데님 팬츠", "구스다운 패딩", "린넨 셔츠",
  "니트 가디건", "조거 트레이닝 팬츠", "후드 집업", "셔츠 원피스", "울 코트",
  "스니커즈", "캔버스 토트백", "가죽 벨트", "비니 모자", "크루삭스 3팩",
]
const KO_LAST = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권"]
const KO_FIRST = ["민준", "서연", "도윤", "지우", "예준", "하윤", "주원", "지민", "지호", "수아", "건우", "다은", "우진", "채원", "현우"]
const REVIEW_TEXT = [
  "배송 빠르고 제품 좋아요!", "사이즈가 딱 맞아요. 만족합니다.", "색감이 화면이랑 똑같아요.",
  "재질이 생각보다 좋네요.", "가성비 최고입니다.", "재구매 의사 있어요.",
  "포장 꼼꼼하게 잘 왔어요.", "선물용으로 좋아요.", "디자인 예뻐요 ㅎㅎ", "무난하게 입기 좋아요.",
  "기대 이상이었습니다.", "두께감 적당해요.", "세탁해도 변형 없어요.", "코디하기 편해요.", "강추합니다!",
]

export default async function seedTestData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const regionModule = container.resolve(Modules.REGION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const reviewService = container.resolve("review") as any
  const pointService = container.resolve("customerPoint") as any

  // ── 사전 자원 ─────────────────────────────────────────────
  const [salesChannel] = await salesChannelModule.listSalesChannels({}, { take: 1 })
  const [region] = await regionModule.listRegions({ currency_code: CUR }, { take: 1 })
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({}, { take: 1 })
  if (!salesChannel || !region || !shippingProfile) {
    throw new Error("사전 자원 없음(판매채널/리전/배송프로파일). 먼저 db:migrate 시드를 확인하세요.")
  }
  const scId = salesChannel.id
  const regionId = region.id
  logger.info(`자원 확인: sc=${scId}, region=${regionId}(${CUR}), profile=${shippingProfile.id}`)

  // ── 1) 카테고리 5 ─────────────────────────────────────────
  const catNames = ["상의", "하의", "아우터", "신발", "액세서리"].map((n) => `${n}(${TAG})`)
  let categories: any[] = []
  const { data: existingCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
    filters: { name: catNames } as any,
  })
  if (existingCats.length >= catNames.length) {
    categories = existingCats
    logger.info(`카테고리 존재(skip): ${categories.length}`)
  } else {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: catNames.map((name) => ({ name, is_active: true })) },
    })
    categories = result
    logger.info(`카테고리 생성: ${categories.length}`)
  }
  const catId = (i: number) => categories[i % categories.length].id

  // ── 2) 상품 15 ────────────────────────────────────────────
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id", "variants.title"],
    filters: { handle: KO_PRODUCTS.map((_, i) => `${TAG}-p${i + 1}`) } as any,
  })
  let products: any[] = existingProducts
  if (products.length < KO_PRODUCTS.length) {
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: KO_PRODUCTS.map((title, i) => {
          const price = 19000 + i * 3000
          return {
            title,
            handle: `${TAG}-p${i + 1}`,
            description: `${title} — 테스트 시드 상품입니다.`,
            status: "published" as any,
            shipping_profile_id: shippingProfile.id,
            category_ids: [catId(i)],
            sales_channels: [{ id: scId }],
            options: [{ title: "사이즈", values: ["S", "M", "L"] }],
            variants: ["S", "M", "L"].map((sz) => ({
              title: `${title} / ${sz}`,
              sku: `${TAG}-SKU-${i + 1}-${sz}`,
              options: { 사이즈: sz },
              manage_inventory: false,
              prices: [{ amount: price, currency_code: CUR }],
            })),
          }
        }),
      },
    })
    products = result
    logger.info(`상품 생성: ${products.length}`)
  } else {
    logger.info(`상품 존재(skip): ${products.length}`)
  }
  // 주문/리뷰에 쓸 variant + 가격 매핑
  const variantOf = (p: any) => (p.variants?.[0]) ?? null

  // ── 3) 고객 15 ────────────────────────────────────────────
  const emails = Array.from({ length: 15 }, (_, i) => `user${String(i + 1).padStart(2, "0")}@${TAG}.local`)
  const existingCustomers = await customerModule.listCustomers({ email: emails }, { take: 100 })
  let customers: any[] = existingCustomers
  if (customers.length < emails.length) {
    const { result } = await createCustomersWorkflow(container).run({
      input: {
        customersData: emails.map((email, i) => ({
          email,
          first_name: KO_FIRST[i],
          last_name: KO_LAST[i],
          phone: `010-${String(1000 + i).padStart(4, "0")}-${String(5000 + i).padStart(4, "0")}`,
          has_account: false,
        })),
      },
    })
    customers = result
    logger.info(`고객 생성: ${customers.length}`)
  } else {
    logger.info(`고객 존재(skip): ${customers.length}`)
  }

  // ── 4) 주문 15 (createOrderWorkflow = 수기/직접 주문 경로) ──
  const { data: existingOrders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: {} as any,
    pagination: { take: 200 },
  })
  const seededOrders = existingOrders.filter((o: any) => o?.metadata?.seed_tag === TAG)
  if (seededOrders.length < 15) {
    let created = 0
    for (let i = 0; i < 15; i++) {
      const cust = customers[i % customers.length]
      const prod = products[i % products.length]
      const v = variantOf(prod)
      if (!v) continue
      const qty = (i % 3) + 1
      const unit = 19000 + (i % products.length) * 3000
      try {
        await createOrderWorkflow(container).run({
          input: {
            region_id: regionId,
            sales_channel_id: scId,
            currency_code: CUR,
            customer_id: cust.id,
            email: cust.email,
            status: i % 4 === 0 ? "completed" : "pending",
            items: [
              { variant_id: v.id, quantity: qty, title: v.title, unit_price: unit },
            ],
            shipping_address: {
              first_name: cust.first_name,
              last_name: cust.last_name,
              address_1: `서울특별시 강남구 테헤란로 ${100 + i}`,
              city: "서울",
              country_code: "dk",
              postal_code: `0${6000 + i}`,
              phone: cust.phone,
            },
            metadata: { seed_tag: TAG },
          } as any,
        })
        created++
      } catch (e: any) {
        logger.warn(`주문 ${i + 1} 생성 실패(무시): ${e?.message}`)
      }
    }
    logger.info(`주문 생성: ${created}`)
  } else {
    logger.info(`주문 존재(skip): ${seededOrders.length}`)
  }

  // ── 5) 리뷰 15 (review 모듈) ──────────────────────────────
  const existingReviews = await reviewService.query({ type: "review", limit: 1000 }).catch(() => null)
  const reviewCount = existingReviews?.count ?? existingReviews?.items?.length ?? 0
  if (reviewCount < 15) {
    let created = 0
    for (let i = 0; i < 15; i++) {
      const prod = products[i % products.length]
      const cust = customers[i % customers.length]
      try {
        await reviewService.create({
          type: "review",
          product_id: prod.id,
          product_title: prod.title,
          author_name: `${KO_LAST[i]}${KO_FIRST[i]}`,
          author_email: cust.email,
          rating: (i % 5) + 1,
          title: `${prod.title} 후기`,
          content: REVIEW_TEXT[i],
          status: "published",
        })
        created++
      } catch (e: any) {
        logger.warn(`리뷰 ${i + 1} 실패(무시): ${e?.message}`)
      }
    }
    logger.info(`리뷰 생성: ${created}`)
  } else {
    logger.info(`리뷰 존재(skip): ${reviewCount}`)
  }

  // ── 6) 적립금 15건 (customer-point 모듈) ──────────────────
  let pointsCreated = 0
  const nowIso = new Date().toISOString()
  for (let i = 0; i < 15; i++) {
    const cust = customers[i % customers.length]
    try {
      await pointService.earnPoints(cust.id, 1000 + i * 500, {
        earnedAtIso: nowIso,
        validDays: 365,
        reason: "signup",
      })
      pointsCreated++
    } catch (e: any) {
      logger.warn(`적립금 ${i + 1} 실패(무시): ${e?.message}`)
    }
  }
  logger.info(`적립금 적립: ${pointsCreated}`)

  // ── 7) 데모: 계정회원 + VIP 그룹 (회원 탭 '정상'/'VIP' 시연용) ──
  const demoEmails = Array.from({ length: 6 }, (_, i) => `member${String(i + 1).padStart(2, "0")}@kr-demo.local`)
  const existingDemo = await customerModule.listCustomers({ email: demoEmails }, { take: 100 })
  let demoMembers: any[] = existingDemo
  if (demoMembers.length < demoEmails.length) {
    const { result } = await createCustomersWorkflow(container).run({
      input: {
        customersData: demoEmails.map((email, i) => ({
          email,
          first_name: KO_FIRST[(i + 5) % KO_FIRST.length],
          last_name: KO_LAST[(i + 5) % KO_LAST.length],
          phone: `010-7${String(100 + i).padStart(3, "0")}-${String(2000 + i).padStart(4, "0")}`,
          has_account: true, // 계정회원(정상 탭 대상)
        })),
      },
    })
    demoMembers = result
    logger.info(`데모 계정회원 생성: ${demoMembers.length}`)
  } else {
    logger.info(`데모 계정회원 존재(skip): ${demoMembers.length}`)
  }

  // VIP 그룹
  const { data: existingVip } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name"],
    filters: { name: "VIP" } as any,
  })
  let vipGroup: any = existingVip[0]
  if (!vipGroup) {
    const { result } = await createCustomerGroupsWorkflow(container).run({
      input: { customersData: [{ name: "VIP" }] },
    })
    vipGroup = result[0]
    logger.info(`VIP 그룹 생성: ${vipGroup.id}`)
  } else {
    logger.info(`VIP 그룹 존재(skip): ${vipGroup.id}`)
  }

  // 데모 회원 앞 3명 VIP 지정
  if (vipGroup && demoMembers.length > 0) {
    try {
      await linkCustomersToCustomerGroupWorkflow(container).run({
        input: { id: vipGroup.id, add: demoMembers.slice(0, 3).map((m) => m.id) },
      })
      logger.info(`VIP 그룹에 ${Math.min(3, demoMembers.length)}명 지정`)
    } catch (e: any) {
      logger.info(`VIP 지정 skip/실패(무시): ${e?.message}`)
    }
  }

  logger.info("================ 테스트 데이터 시드 완료 ================")
}

// 스토어프론트 노출 콘텐츠 시드 (CMS: 배너/공지/FAQ/홈큐레이션 + 타임세일).
// 실행: npx medusa exec ./src/scripts/seed-storefront-content.ts (재실행 안전)
//
// 목적: 새 환경에서 홈/고객센터/타임세일 화면이 비어보이지 않도록 기본 데이터를 채운다.
// 멱등: 각 종류별로 기존 행이 있으면 생성 단계를 건너뛴다(테이블 단위 존재 체크).
//   → 이미 관리자가 만든 콘텐츠를 덮어쓰지 않기 위함. 다시 깔려면 해당 테이블 비운 뒤 재실행.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seedStorefrontContent({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cms: any = container.resolve("cms")
  const timeSale: any = container.resolve("timeSale")

  // 게시 상품 조회(홈큐레이션/타임세일 대상)
  const { data: prods } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    filters: { status: "published" } as any,
    pagination: { take: 12 } as any,
  })
  const products = prods as any[]

  // ── ① 배너(hero 3 + popup 1) ──────────────────────────────
  const existingBanners = await cms.listBanners({})
  if (existingBanners.length === 0) {
    await cms.createBanners([
      { kind: "hero", title: "여름 시즌 오프 최대 50%", image_url: "https://picsum.photos/seed/hero1/1200/400", link_url: "/kr/store", sort_order: 1, status: "published", starts_at: null, ends_at: null },
      { kind: "hero", title: "신상품 입고 — 지금 만나보세요", image_url: "https://picsum.photos/seed/hero2/1200/400", link_url: "/kr/store", sort_order: 2, status: "published", starts_at: null, ends_at: null },
      { kind: "hero", title: "회원 가입하고 적립금 받기", image_url: "https://picsum.photos/seed/hero3/1200/400", link_url: "/kr/account", sort_order: 3, status: "published", starts_at: null, ends_at: null },
      { kind: "popup", title: "오늘의 특가 알림", image_url: "https://picsum.photos/seed/popup1/600/700", link_url: "/kr/store", sort_order: 1, status: "published", starts_at: null, ends_at: null },
    ])
    logger.info("[content] 배너 생성: hero 3 + popup 1")
  } else {
    logger.info(`[content] 배너 존재(skip): ${existingBanners.length}`)
  }

  // ── ② 공지 3 ──────────────────────────────────────────────
  const existingNotices = await cms.listNotices({})
  if (existingNotices.length === 0) {
    await cms.createNotices([
      { title: "[안내] 여름 배송 일정 변경 안내", body: "혹서기 배송 지연이 발생할 수 있습니다. 넉넉한 배송 기간을 안내드립니다.", pinned: true, status: "published" },
      { title: "[이벤트] 신규 회원 웰컴 쿠폰 지급", body: "가입 즉시 10% 할인 쿠폰(WELCOME10)이 지급됩니다.", pinned: false, status: "published" },
      { title: "[안내] 개인정보처리방침 개정 안내", body: "개인정보처리방침이 일부 개정되었습니다. 자세한 내용은 약관 페이지를 확인해주세요.", pinned: false, status: "published" },
    ])
    logger.info("[content] 공지 3건 생성")
  } else {
    logger.info(`[content] 공지 존재(skip): ${existingNotices.length}`)
  }

  // ── ③ FAQ 6 ──────────────────────────────────────────────
  const existingFaqs = await cms.listFaqs({})
  if (existingFaqs.length === 0) {
    await cms.createFaqs([
      { category: "주문/결제", question: "주문 취소는 어떻게 하나요?", answer: "마이페이지 > 주문내역에서 배송 전 주문에 한해 취소 신청이 가능합니다.", sort_order: 1, status: "published" },
      { category: "주문/결제", question: "어떤 결제 수단을 사용할 수 있나요?", answer: "신용카드, 계좌이체, 무통장입금을 지원합니다.", sort_order: 2, status: "published" },
      { category: "배송", question: "배송비는 얼마인가요?", answer: "5만원 이상 구매 시 무료, 미만은 3,000원입니다.", sort_order: 3, status: "published" },
      { category: "배송", question: "배송 조회는 어디서 하나요?", answer: "마이페이지 > 주문내역의 배송조회 버튼으로 확인하실 수 있습니다.", sort_order: 4, status: "published" },
      { category: "교환/반품", question: "교환/반품 기간은 어떻게 되나요?", answer: "상품 수령 후 7일 이내 신청 가능합니다(단순 변심 시 왕복 배송비 부담).", sort_order: 5, status: "published" },
      { category: "회원/적립금", question: "적립금은 어떻게 사용하나요?", answer: "결제 단계에서 보유 적립금을 사용할 수 있습니다. 등급별 적립률이 다릅니다.", sort_order: 6, status: "published" },
    ])
    logger.info("[content] FAQ 6건 생성")
  } else {
    logger.info(`[content] FAQ 존재(skip): ${existingFaqs.length}`)
  }

  // ── ④ 홈 큐레이션(MD 추천) — 게시 상품 상위 6개 ──────────────
  const existingCuration = await cms.listHomeCurations({})
  if (existingCuration.length === 0 && products.length > 0) {
    await cms.createHomeCurations(
      products.slice(0, 6).map((p, i) => ({ product_id: p.id, sort_order: i + 1, status: "published" }))
    )
    logger.info(`[content] 홈 큐레이션 ${Math.min(6, products.length)}건 생성`)
  } else {
    logger.info(`[content] 홈 큐레이션 존재/상품없음(skip): ${existingCuration.length}`)
  }

  // ── ⑤ 타임세일 — 진행 중(active) 2건 ───────────────────────
  const existingSales = await timeSale.listSales({}, { limit: 5 })
  if ((existingSales?.count ?? 0) === 0 && products.length >= 2) {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 어제 시작
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3일 뒤 종료
    await timeSale.createSale({
      product_id: products[0].id,
      title: `${products[0].title} 타임세일`,
      discount_type: "percent",
      discount_value: 30,
      starts_at: past,
      ends_at: future,
      status: "active",
    })
    await timeSale.createSale({
      product_id: products[1].id,
      title: `${products[1].title} 특가`,
      discount_type: "percent",
      discount_value: 20,
      starts_at: past,
      ends_at: future,
      status: "active",
    })
    logger.info("[content] 타임세일 2건 생성(active)")
  } else {
    logger.info(`[content] 타임세일 존재/상품부족(skip): ${existingSales?.count ?? 0}`)
  }

  logger.info("================ 스토어프론트 콘텐츠 시드 완료 ================")
}

// 빈 화면 보강 시드 (커스텀 모듈) — 약관 문서 3종 + 고객문의(1:1/상품 Q&A).
// 실행: npx medusa exec ./src/scripts/seed-cs-legal.ts (재실행 안전)
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seedCsLegal({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const legal: any = container.resolve("legalDoc")
  const reviewService: any = container.resolve("review")

  // 게시용 actor(관리자 user) id
  const { data: users } = await query.graph({ entity: "user", fields: ["id"] })
  const actorId = (users as any[])[0]?.id ?? "seed-script"

  // ── ① 약관 문서 (없는 type만) ──────────────────────────────
  const { data: docs } = await query.graph({ entity: "legal_doc", fields: ["id", "type"] })
  const have = new Set((docs as any[]).map((d) => d.type))
  const want = [
    { type: "privacy_policy", name: "개인정보처리방침", publish: true },
    { type: "marketing_consent", name: "마케팅 정보 수신 동의", publish: false },
    { type: "third_party_consent", name: "제3자 정보 제공 동의", publish: false },
  ]
  let legalCreated = 0
  for (const w of want) {
    if (have.has(w.type)) continue
    const doc = await legal.createDraft({
      type: w.type,
      version: "v1.0",
      body: `${w.name} (테스트 본문)\n\n본 문서는 테스트용 초안입니다. 운영 전 실제 약관 내용으로 교체하세요.`,
      effective_at: new Date("2026-07-01"),
      requires_consent: true,
    })
    if (w.publish) await legal.publishDoc(doc.id, actorId)
    legalCreated++
    logger.info(`[cs-legal] 약관 생성: ${w.name} (${w.publish ? "게시" : "초안"})`)
  }
  logger.info(`[cs-legal] 약관 ${legalCreated}건 생성 (기존 ${(docs as any[]).length})`)

  // ── ② 고객문의 (1:1 / 상품 Q&A) ────────────────────────────
  const existingInq = await reviewService.query({ type: "inquiry", limit: 1000 }).catch(() => null)
  const inqCount = existingInq?.count ?? existingInq?.items?.length ?? 0
  if (inqCount === 0) {
    const { data: prods } = await query.graph({
      entity: "product",
      fields: ["id", "title"],
      pagination: { take: 5 } as any,
    })
    const p = prods as any[]

    // 1:1 문의 (product_id 없음)
    const ones: { title: string; content: string; status?: string }[] = [
      { title: "배송 문의드립니다", content: "주문한 상품 배송이 언제 시작되나요?" },
      { title: "환불 절차 문의", content: "환불 신청 후 며칠 안에 처리되나요?", status: "answered" },
      { title: "회원 등급 문의", content: "VIP 등급 조건이 어떻게 되나요?" },
    ]
    // 상품 Q&A (product_id 있음)
    const qnas: { title: string; content: string; status?: string }[] = [
      { title: "사이즈 문의", content: "L 사이즈 재입고 예정 있나요?", status: "answered" },
      { title: "소재 문의", content: "이 제품 세탁기 사용 가능한가요?" },
      { title: "색상 문의", content: "실물 색상이 사진과 동일한가요?" },
    ]

    let made = 0
    for (let i = 0; i < ones.length; i++) {
      await reviewService.create({
        type: "inquiry",
        product_id: null,
        author_name: `테스트회원${i + 1}`,
        author_email: `inquiry0${i + 1}@kr-test.local`,
        title: ones[i].title,
        content: ones[i].content,
        status: ones[i].status ?? "pending",
      })
      made++
    }
    for (let i = 0; i < qnas.length; i++) {
      const prod = p[i % Math.max(1, p.length)]
      await reviewService.create({
        type: "inquiry",
        product_id: prod?.id ?? null,
        product_title: prod?.title ?? null,
        author_name: `구매자${i + 1}`,
        author_email: `qna0${i + 1}@kr-test.local`,
        title: qnas[i].title,
        content: qnas[i].content,
        status: qnas[i].status ?? "pending",
      })
      made++
    }
    logger.info(`[cs-legal] 고객문의 ${made}건 생성 (1:1 ${ones.length} · 상품Q&A ${qnas.length})`)
  } else {
    logger.info(`[cs-legal] 문의 존재(skip): ${inqCount}`)
  }

  logger.info("================ CS/약관 보강 시드 완료 ================")
}

// 로그인 가능한 데모 고객 + 마이페이지 데이터 시드.
// 실행: npx medusa exec ./src/scripts/seed-demo-accounts.ts (재실행 안전)
//
// 생성 계정(공통 비밀번호 test1234!, 도메인 @kr-demo.local):
//   test(일반) / silver(실버) / gold(골드) / vip(VIP)
// 각 계정에 emailpass 인증(auth identity)을 붙여 **실제 스토어프론트 로그인**이 되게 한다.
// (기존 seed-test-data 의 member01~06 은 비밀번호가 없어 로그인 불가였음 → 본 스크립트가 그 공백을 메움)
//
// 함께 시드: 멤버십 등급/누적 · 적립금(earn/redeem) · 기본 배송지 · 동의(marketing/sms/email) · 실주문(등급별 건수).
// 멱등: 계정은 있으면 재사용, 데이터는 고객 단위로 삭제 후 재삽입, 주문은 metadata.demo_email 로 개수 보장.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createCustomersWorkflow, createOrderWorkflow } from "@medusajs/medusa/core-flows"

const PASSWORD = "test1234!"

type DemoAccount = {
  key: string
  email: string
  first: string
  last: string
  phone: string
  tier: string
  accrued: number
  orders: number
  earn: number[]
  redeem: number
  consents: { channel: "marketing" | "sms" | "email"; agreed: boolean }[]
  addr: { address_1: string; city: string; province: string; postal_code: string }
}

const DEMO: DemoAccount[] = [
  {
    key: "test", email: "test@kr-demo.local", first: "길동", last: "홍", phone: "010-1000-0001",
    tier: "일반", accrued: 120000, orders: 1, earn: [1000, 600], redeem: 300,
    consents: [{ channel: "marketing", agreed: true }, { channel: "sms", agreed: false }, { channel: "email", agreed: true }],
    addr: { address_1: "서울 강남구 테헤란로 1", city: "서울", province: "서울", postal_code: "06234" },
  },
  {
    key: "silver", email: "silver@kr-demo.local", first: "민서", last: "김", phone: "010-2000-0001",
    tier: "실버", accrued: 520000, orders: 2, earn: [2000, 1500], redeem: 1000,
    consents: [{ channel: "marketing", agreed: true }, { channel: "sms", agreed: true }, { channel: "email", agreed: true }],
    addr: { address_1: "서울 마포구 월드컵북로 100", city: "서울", province: "서울", postal_code: "03925" },
  },
  {
    key: "gold", email: "gold@kr-demo.local", first: "지후", last: "김", phone: "010-3000-0001",
    tier: "골드", accrued: 1450000, orders: 3, earn: [5000, 4000], redeem: 2000,
    consents: [{ channel: "marketing", agreed: false }, { channel: "sms", agreed: false }, { channel: "email", agreed: true }],
    addr: { address_1: "부산 해운대구 센텀중앙로 90", city: "부산", province: "부산", postal_code: "48058" },
  },
  {
    key: "vip", email: "vip@kr-demo.local", first: "서연", last: "김", phone: "010-4000-0001",
    tier: "VIP", accrued: 3800000, orders: 3, earn: [12000, 9000], redeem: 5000,
    consents: [{ channel: "marketing", agreed: true }, { channel: "sms", agreed: true }, { channel: "email", agreed: false }],
    addr: { address_1: "서울 송파구 올림픽로 300", city: "서울", province: "서울", postal_code: "05551" },
  },
]

export default async function seedDemoAccounts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const authModule: any = container.resolve(Modules.AUTH)
  const customerModule: any = container.resolve(Modules.CUSTOMER)
  const salesChannelModule: any = container.resolve(Modules.SALES_CHANNEL)
  const regionModule: any = container.resolve(Modules.REGION)
  const membership: any = container.resolve("membership")
  const points: any = container.resolve("customerPoint")
  const consent: any = container.resolve("customerConsent")

  const nowIso = new Date().toISOString()

  // ── 주문에 쓸 사전 자원(KRW 리전 우선) ─────────────────────
  let [region] = await regionModule.listRegions({ name: "한국" }, { take: 1 })
  if (!region) [region] = await regionModule.listRegions({ currency_code: "krw" }, { take: 1 })
  const [salesChannel] = await salesChannelModule.listSalesChannels({}, { take: 1 })
  const { data: prods } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id", "variants.title"],
    filters: { status: "published" } as any,
    pagination: { take: 6 } as any,
  })
  const sellable = (prods as any[]).filter((p) => (p.variants?.length ?? 0) > 0)
  const canOrder = !!region && !!salesChannel && sellable.length > 0
  if (!canOrder) {
    logger.warn("[demo] 주문 생성 사전자원 부족(리전/판매채널/상품) — 주문은 건너뜁니다. setup-korea·seed-test-data 선행 필요.")
  }

  let okAccounts = 0

  for (const a of DEMO) {
    try {
      // ── ① 고객(없으면 생성) ─────────────────────────────
      let [customer] = await customerModule.listCustomers({ email: [a.email] }, { take: 1 })
      if (!customer) {
        const { result } = await createCustomersWorkflow(container).run({
          input: {
            customersData: [
              { email: a.email, first_name: a.first, last_name: a.last, phone: a.phone, has_account: true },
            ],
          },
        })
        customer = result[0]
        logger.info(`[demo] 고객 생성: ${a.email}`)
      }

      // ── ② emailpass 인증 부착(로그인 가능하게) ───────────
      // register: 신규/미청구(claimable) 식별자 → authIdentity 반환. 이미 링크됨 → success:false("already exists").
      const reg = await authModule.register("emailpass", { body: { email: a.email, password: PASSWORD } })
      if (reg?.success && reg.authIdentity) {
        const meta = reg.authIdentity.app_metadata ?? {}
        if (meta.customer_id !== customer.id) {
          await authModule.updateAuthIdentities([
            { id: reg.authIdentity.id, app_metadata: { ...meta, customer_id: customer.id } },
          ])
        }
        logger.info(`[demo] 로그인 인증 설정: ${a.email}`)
      } else {
        // 이미 등록/링크된 상태 — 로그인 가능(재실행 정상 경로)
        logger.info(`[demo] 로그인 인증 존재(skip): ${a.email} ${reg?.error ? `(${reg.error})` : ""}`)
      }

      // ── ③ 기본 배송지(없을 때만) ─────────────────────────
      const addresses = await customerModule.listCustomerAddresses({ customer_id: customer.id }, { take: 10 })
      if (addresses.length === 0) {
        await customerModule.createCustomerAddresses([
          {
            customer_id: customer.id,
            first_name: a.first, last_name: a.last,
            address_1: a.addr.address_1, city: a.addr.city, province: a.addr.province,
            postal_code: a.addr.postal_code, country_code: "kr", phone: a.phone,
            is_default_shipping: true, is_default_billing: true,
          },
        ])
        logger.info(`[demo] 배송지 생성: ${a.email}`)
      }

      // ── ④ 멤버십 등급/누적(삭제 후 재삽입) ───────────────
      const exMem = await membership.listCustomerMemberships({ customer_id: customer.id })
      if (exMem.length) await membership.deleteCustomerMemberships(exMem.map((m: any) => m.id))
      await membership.createCustomerMemberships([
        { customer_id: customer.id, accrued_amount: a.accrued, current_tier: a.tier, last_change_reason: "시드" },
      ])

      // ── ⑤ 적립금(고객 원장 삭제 후 재적립) ───────────────
      const exLedger = await points.listPointLedgers({ customer_id: customer.id })
      if (exLedger.length) await points.deletePointLedgers(exLedger.map((r: any) => r.id))
      for (const amt of a.earn) {
        await points.earnPoints(customer.id, amt, { validDays: 365, earnedAtIso: nowIso, // 사유는 **코드**로 남긴다 — 스토어프론트가 언어에 맞는 문구로 바꿔 보여 준다
          // (자유 문장을 넣으면 영어 화면에도 한국어가 그대로 나온다)
          reason: "purchase" })
      }
      if (a.redeem > 0) await points.redeemPoints(customer.id, a.redeem, "redeem")

      // ── ⑥ 동의(고객 이력 삭제 후 재기록) ─────────────────
      const exConsent = await consent.listConsentLogs({ customer_id: customer.id })
      if (exConsent.length) await consent.deleteConsentLogs(exConsent.map((r: any) => r.id))
      for (const c of a.consents) {
        await consent.recordConsent(customer.id, c.channel, c.agreed, nowIso)
      }

      // ── ⑦ 실주문(등급별 건수, metadata.demo_email 로 멱등) ──
      if (canOrder) {
        const { data: existOrders } = await query.graph({
          entity: "order",
          fields: ["id", "metadata"],
          pagination: { take: 500 } as any,
        })
        const mine = (existOrders as any[]).filter((o) => o?.metadata?.demo_email === a.email)
        let made = mine.length
        for (let i = mine.length; i < a.orders; i++) {
          const prod = sellable[i % sellable.length]
          const v = prod.variants[0]
          const unit = 25000 + (i % 3) * 5000
          try {
            await createOrderWorkflow(container).run({
              input: {
                region_id: region.id,
                sales_channel_id: salesChannel.id,
                currency_code: "krw",
                customer_id: customer.id,
                email: a.email,
                status: i === 0 ? "completed" : "pending",
                items: [{ variant_id: v.id, quantity: (i % 2) + 1, title: v.title, unit_price: unit }],
                shipping_address: {
                  first_name: a.first, last_name: a.last,
                  address_1: a.addr.address_1, city: a.addr.city, province: a.addr.province,
                  postal_code: a.addr.postal_code, country_code: "kr", phone: a.phone,
                },
                metadata: { seed_tag: "kr-demo", demo_email: a.email },
              } as any,
            })
            made++
          } catch (e: any) {
            logger.warn(`[demo] 주문 생성 실패(${a.email} #${i + 1}, 무시): ${e?.message}`)
          }
        }
        logger.info(`[demo] 주문 보장: ${a.email} → ${made}/${a.orders}`)
      }

      okAccounts++
    } catch (e: any) {
      logger.error(`[demo] 계정 처리 실패(${a.email}): ${e?.message}`)
    }
  }

  // ── 완료 요약 ─────────────────────────────────────────────
  logger.info("---------------- 데모 계정 요약 ----------------")
  for (const a of DEMO) {
    try {
      const [c] = await customerModule.listCustomers({ email: [a.email] }, { take: 1 })
      if (!c) continue
      const bal = await points.getBalance(c.id)
      logger.info(`  ${a.email} | 등급 ${a.tier} | 누적 ${a.accrued.toLocaleString()} | 적립금 ${bal} | 주문 ${a.orders} | pw ${PASSWORD}`)
    } catch { /* skip */ }
  }
  logger.info(`================ 데모 로그인 계정 시드 완료 (${okAccounts}/${DEMO.length}) ================`)
}

// 통합 시드 오케스트레이터 — 새 환경에서 이 한 줄이면 화면 확인용 데이터가 전부 준비된다.
// 실행: npx medusa exec ./src/scripts/seed-all.ts (재실행 안전 / 멱등)
//
// 전제: docker(shop-postgres/shop-redis) 기동 + `npx medusa db:migrate` 완료(마이그레이션이
//       기본 store/EUR 리전/상품 4종/재고/퍼블리셔블 키를 자동 시드함, migration-scripts/initial-data-seed.ts).
//
// 이 스크립트가 순서대로 실행하는 것(각 단계는 개별 멱등, 실패해도 다음 단계 계속):
//   0) 관리자 계정(admin@shop.local / admin1234!)  — 없을 때만 생성
//   1) 한국(KRW) 설정 + 현지화(가격/창고명)
//   2) 테스트 카탈로그/고객/주문/리뷰 + 상품군·분류 + 홈 컬렉션 + 재고
//   3) 코어 화면 데이터(태그/쿠폰) + CS/약관 + 스토어프론트 콘텐츠(배너/공지/FAQ/큐레이션/타임세일)
//   4) 상태머신 · RMA 반품정책
//   5) 로그인 데모 계정(test/silver/gold/vip @kr-demo.local, pw test1234!) + 마이페이지 데이터
//
// 개별 스크립트를 따로 돌리고 싶으면 각 파일 헤더의 실행 커맨드 참고.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUsersWorkflow } from "@medusajs/medusa/core-flows"

import setupKorea from "./setup-korea"
import setupTranslation from "./setup-translation"
import localizeShopData from "./localize-shop-data"
import seedTestData from "./seed-test-data"
import seedProductTypes from "./seed-product-types"
import seedHomeCollections from "./seed-home-collections"
import seedProductDetails from "./seed-product-details"
import seedContentEn from "./seed-content-en"
import seedLegalEn from "./seed-legal-en"
import seedInventory from "./seed-inventory"
import seedScreenData from "./seed-screen-data"
import seedCsLegal from "./seed-cs-legal"
import seedStorefrontContent from "./seed-storefront-content"
import seedDemoAccounts from "./seed-demo-accounts"
import seedStateMachine from "../modules/state-machine/seed"
import seedRmaExtension from "../modules/rma-extension/seed"

/** 관리자 user 계정이 하나도 없으면 emailpass 로그인 가능한 admin 을 생성 + super 등급 부여(RBAC 부트스트랩). */
async function ensureAdmin(container: any, logger: any): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const rbac: any = container.resolve("rbac")

  // RBAC 기본 등급/권한 매트릭스 시드(idempotent) — 어떤 환경이든 등급 매트릭스 보장
  try {
    const r = await rbac.seedDefaults()
    logger.info(`[admin] RBAC 기본 등급/권한 시드: roles=${r.roles} perms=${r.permissions}`)
  } catch (e: any) {
    logger.warn(`[admin] RBAC seedDefaults 경고(무시): ${e?.message}`)
  }

  const { data: users } = await query.graph({ entity: "user", fields: ["id"] })
  if ((users as any[]).length > 0) {
    // 기존 환경: 관리자 잠금 방지 위해 자동 super 부여는 하지 않음(super 배정 전까지 grace).
    const hasSuper = await rbac.hasSuperAdmin().catch(() => false)
    logger.info(`[admin] 관리자 존재(skip 생성): ${(users as any[]).length}명 · super존재=${hasSuper}`)
    if (!hasSuper) {
      logger.info(`[admin] ⚠ super 등급 관리자가 없어 RBAC 는 grace(허용) 상태. 정식 강제하려면 super 배정 필요: `
        + `POST /admin/rbac/users/:id {role_key:"super"}`)
    }
    return
  }

  const email = process.env.ADMIN_EMAIL || "admin@shop.local"
  const password = process.env.ADMIN_PASSWORD || "admin1234!"
  const authModule: any = container.resolve(Modules.AUTH)

  const reg = await authModule.register("emailpass", { body: { email, password } })
  const { result } = await createUsersWorkflow(container).run({
    input: { users: [{ email, first_name: "관리자" }] as any },
  })
  const user = result[0]
  if (reg?.success && reg.authIdentity) {
    const meta = reg.authIdentity.app_metadata ?? {}
    await authModule.updateAuthIdentities([
      { id: reg.authIdentity.id, app_metadata: { ...meta, user_id: user.id } },
    ])
  }
  // 부트스트랩 super 부여 → 이 시점부터 미배정 관리자는 fail-closed(차단)
  try {
    await rbac.assignRole(user.id, "super")
    logger.info(`[admin] 관리자 생성 + super 등급 부여: ${email}`)
  } catch (e: any) {
    logger.warn(`[admin] super 등급 부여 경고(무시): ${e?.message}`)
    logger.info(`[admin] 관리자 생성: ${email}`)
  }
}

/** RMA 시드는 비멱등 → 정책이 이미 있으면 건너뛴다. */
async function guardedRma(container: any, logger: any): Promise<void> {
  const rma: any = container.resolve("rmaExtension")
  const existing = await rma.listReturnsPolicies({}).catch(() => [])
  if ((existing?.length ?? 0) > 0) {
    logger.info(`[rma] 반품정책 존재(skip): ${existing.length}`)
    return
  }
  await seedRmaExtension({ container } as any)
}

export default async function seedAll({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  async function step(label: string, fn: () => Promise<any>): Promise<void> {
    logger.info(`\n▶ ${label} …`)
    try {
      await fn()
      logger.info(`✔ ${label}`)
    } catch (e: any) {
      logger.error(`✗ ${label} 실패(계속 진행): ${e?.message ?? e}`)
    }
  }

  logger.info("################ 통합 시드 시작 ################")

  // 0) 관리자
  await step("관리자 계정", () => ensureAdmin(container, logger))

  // 1) 한국 설정
  await step("한국(KRW) 설정", () => setupKorea({ container } as any))
  await step("현지화(가격/창고명)", () => localizeShopData({ container } as any))
  // 다국어: 스토어 지원 언어(한국어·영어) + 번역 대상 필드 지정.
  // 이게 없으면 `/store/locales` 가 빈 배열이라 **스토어프론트 언어 선택기가 아예 안 뜬다.**
  // (2026-08-05 실측: fresh DB 에서 마이그레이션만 하면 이 상태가 된다)
  await step("다국어(지원 언어·번역 대상)", () => setupTranslation({ container } as any))

  // 2) 카탈로그·고객·주문·재고
  await step("테스트 데이터(상품/고객/주문/리뷰/적립금)", () => seedTestData({ container } as any))
  await step("상품군/분류/고시필드", () => seedProductTypes({ container } as any))
  await step("홈 컬렉션(베스트/신상품)", () => seedHomeCollections({ container } as any))
  await step("상품 상세값(부제/설명/소재/유형/태그/카테고리/고시)", () => seedProductDetails({ container } as any))
  await step("재고 수량", () => seedInventory({ container } as any))

  // 3) 화면 보강
  await step("코어 화면 데이터(태그/쿠폰/캠페인)", () => seedScreenData({ container } as any))
  await step("CS/약관(이용약관·개인정보·문의)", () => seedCsLegal({ container } as any))
  await step("스토어프론트 콘텐츠(배너/공지/FAQ/큐레이션/타임세일)", () => seedStorefrontContent({ container } as any))

  // 3-1) 콘텐츠 영어 번역
  // 번역 기능만 켜 두고 **번역 데이터가 없으면** 언어를 바꿔도 상품·카테고리가 한국어로 나온다.
  // 콘텐츠(배너·공지·FAQ)가 다 만들어진 뒤에 돌려야 대상이 전부 잡힌다.
  await step("콘텐츠 영어 번역(상품/카테고리/배너/공지/FAQ)", () => seedContentEn({ container } as any))
  // 약관 영문본은 본문이 길어 별도 스크립트 — **참고용 번역**이며 법적 효력은 한국어 원문에 있다.
  await step("약관·개인정보처리방침 영문본", () => seedLegalEn({ container } as any))

  // 4) 정책 모듈
  await step("상태머신 설정", () => seedStateMachine({ container } as any))
  await step("RMA 반품정책", () => guardedRma(container, logger))

  // 5) 로그인 데모 계정 (상품/리전 준비 후 마지막)
  await step("데모 로그인 계정 + 마이페이지 데이터", () => seedDemoAccounts({ container } as any))

  logger.info("\n################ 통합 시드 완료 ################")
  logger.info("관리자: admin@shop.local / admin1234!  (:7002 admin, :9000 /admin API)")
  logger.info("고객:  test|silver|gold|vip @kr-demo.local / test1234!  (:8000/kr 로그인)")
}

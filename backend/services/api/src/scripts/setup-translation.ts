// 다국어 콘텐츠 번역 초기 설정 (2026-08-05 신설) — 재실행 안전(멱등)
//
// ── 이 스크립트가 하는 일 ──────────────────────────────────────────────────
//  ① 스토어의 **지원 언어**를 지정한다 (기본: 한국어 + 영어)
//     → 지정하지 않으면 `/store/locales` 가 빈 배열을 돌려주고
//       스토어프론트의 언어 선택 UI 가 화면에 나타나지 않는다.
//  ② 어떤 **엔티티의 어떤 필드**를 번역 대상으로 볼지 정한다
//     → 관리자 번역 화면에 뜨는 입력칸이 이 설정에서 나온다.
//
// ── 전제 ────────────────────────────────────────────────────────────────────
//  · `medusa-config.ts` 에 `@medusajs/translation` 모듈 등록
//  · `featureFlags.translation = true`  ← 이게 없으면 라우트가 404 다
//  · `npx medusa db:migrate` 완료 (locale / translation / translation_settings 테이블)
//
// ── 실행 ────────────────────────────────────────────────────────────────────
//   npx medusa exec ./src/scripts/setup-translation.ts
//
//   지원 언어를 바꾸려면:
//   TRANSLATION_LOCALES=ko-KR,en-US,ja-JP npx medusa exec ./src/scripts/setup-translation.ts
//
// ── 범위 주의 ───────────────────────────────────────────────────────────────
// 여기서 다루는 건 **운영자가 관리자 화면에서 입력하는 콘텐츠**뿐이다.
// (상품명·설명·카테고리명 등 — 상품을 올릴 때마다 사람이 번역을 넣어야 하는 것)
//
// 화면의 버튼·안내문 같은 **UI 라벨은 번역 대상이 아니다.** 그건 코드에서
// ko/en 메시지로 관리한다 — 운영자가 건드릴 일이 없고, 건드리면 화면이 깨진다.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/** 기본 지원 언어 — 한국 쇼핑몰이므로 한국어가 기준, 영어를 추가 제공. */
const DEFAULT_LOCALES = ["ko-KR", "en-US"]

/**
 * 번역 대상 엔티티와 필드.
 *
 * 고르는 기준: **고객 화면에 글자로 보이고, 상품마다 값이 다른 것**만 넣는다.
 * handle(URL)·SKU·가격 같은 건 번역 대상이 아니다 — 언어별로 달라지면 안 되거나 숫자다.
 */
const TRANSLATABLE = [
  {
    entity_type: "product",
    fields: ["title", "subtitle", "description", "material"],
    note: "상품명·설명",
  },
  {
    entity_type: "product_variant",
    fields: ["title"],
    note: "옵션 조합명 (예: 화이트 / L)",
  },
  {
    entity_type: "product_option",
    fields: ["title"],
    note: "옵션 이름 (예: 색상)",
  },
  {
    entity_type: "product_option_value",
    fields: ["value"],
    note: "옵션 값 (예: 화이트)",
  },
  {
    entity_type: "product_category",
    fields: ["name", "description"],
    note: "카테고리명",
  },
  {
    entity_type: "product_collection",
    fields: ["title"],
    note: "컬렉션명",
  },
  {
    entity_type: "product_type",
    fields: ["value"],
    note: "상품 유형",
  },
  {
    entity_type: "product_tag",
    fields: ["value"],
    note: "상품 태그",
  },
  {
    entity_type: "shipping_option",
    fields: ["name"],
    note: "배송 방법명 (결제 화면에 노출)",
  },

  // ── 이 프로젝트가 따로 만든 모듈 ─────────────────────────────────────────
  // 코어는 이 엔티티들을 모르므로 **번역을 자동 적용하지 않는다.**
  // 저장은 같은 테이블에 되지만, 고객 응답에 반영하려면 각 store 라우트에서
  // `applyTranslations()` 를 호출해야 한다(api/_utils/apply-translations.ts).
  // 여기 목록과 그 파일의 CUSTOM_TRANSLATABLE 은 **같이 고쳐야 한다.**
  { entity_type: "notice", fields: ["title", "body"], note: "공지사항" },
  { entity_type: "faq", fields: ["question", "answer", "category"], note: "자주 묻는 질문" },
  { entity_type: "banner", fields: ["title"], note: "배너 문구" },
  { entity_type: "legal_doc", fields: ["body"], note: "약관·정책 본문 (번역본 법적 효력은 별도 검토)" },
  // 상품고시는 제외 — 값이 개별 컬럼이 아니라 fields_json 블롭이라 필드 단위 치환이 불가하다.
]

export default async function setupTranslation({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const wanted = (process.env.TRANSLATION_LOCALES || DEFAULT_LOCALES.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  logger.info(`[translation] 설정 시작 — 지원 언어: ${wanted.join(", ")}`)

  // ── 0. 모듈이 실제로 붙어 있는지 먼저 확인한다 ────────────────────────────
  // (모듈 등록이나 피처 플래그를 빠뜨리면 여기서 명확히 멈추는 편이 낫다)
  let translationSvc: any
  try {
    translationSvc = container.resolve("translation")
  } catch {
    logger.error(
      "[translation] 번역 모듈이 등록돼 있지 않습니다.\n" +
        "  medusa-config.ts 의 modules 에 { resolve: \"@medusajs/translation\" } 을 추가하고\n" +
        "  featureFlags.translation = true 로 켠 뒤 db:migrate 를 실행하세요."
    )
    return
  }

  // ── 1. 사용 가능한 언어 확인 ──────────────────────────────────────────────
  const locales: any[] = await translationSvc.listLocales(
    { code: wanted },
    { select: ["code", "name"] }
  )
  const foundCodes = new Set(locales.map((l) => l.code))
  const missing = wanted.filter((c) => !foundCodes.has(c))
  if (missing.length) {
    logger.error(
      `[translation] 알 수 없는 언어 코드: ${missing.join(", ")}\n` +
        "  BCP 47 형식이어야 합니다(예: ko-KR, en-US, ja-JP). locale 테이블에서 확인하세요."
    )
    return
  }
  for (const l of locales) logger.info(`[translation]   · ${l.code} — ${l.name}`)

  // ── 2. 스토어 지원 언어 지정 ──────────────────────────────────────────────
  const storeSvc = container.resolve(Modules.STORE) as any
  const [store] = await storeSvc.listStores({}, { take: 1 })
  if (!store) {
    logger.error("[translation] 스토어를 찾지 못했습니다.")
    return
  }

  const { data: [storeWithLocales] } = await query.graph({
    entity: "store",
    fields: ["id", "supported_locales.locale_code"],
    filters: { id: store.id },
  })
  const current = new Set(
    (storeWithLocales?.supported_locales ?? []).map((s: any) => s.locale_code)
  )
  const same =
    current.size === wanted.length && wanted.every((c) => current.has(c))

  if (same) {
    logger.info(`[translation] 스토어 지원 언어 이미 일치 — 변경 없음`)
  } else {
    await storeSvc.updateStores(store.id, {
      supported_locales: wanted.map((locale_code) => ({ locale_code })),
    })
    logger.info(
      `[translation] 스토어 지원 언어 설정 — ${[...current].join(",") || "(없음)"} → ${wanted.join(",")}`
    )
  }

  // ── 3. 번역 대상 엔티티·필드 설정 ─────────────────────────────────────────
  const existing: any[] = await translationSvc.listTranslationSettings({})
  const byType = new Map(existing.map((s) => [s.entity_type, s]))

  let created = 0
  let updated = 0
  for (const t of TRANSLATABLE) {
    const cur = byType.get(t.entity_type)
    if (!cur) {
      await translationSvc.createTranslationSettings([
        { entity_type: t.entity_type, fields: t.fields, is_enabled: true },
      ])
      created++
      logger.info(`[translation]   + ${t.entity_type} (${t.note}) — ${t.fields.join(", ")}`)
      continue
    }
    const curFields: string[] = Array.isArray(cur.fields) ? cur.fields : []
    const sameFields =
      curFields.length === t.fields.length && t.fields.every((f) => curFields.includes(f))
    if (sameFields && cur.is_enabled) continue

    await translationSvc.updateTranslationSettings([
      { id: cur.id, fields: t.fields, is_enabled: true },
    ])
    updated++
    logger.info(`[translation]   ~ ${t.entity_type} (${t.note}) — 필드 갱신`)
  }

  logger.info(
    `[translation] 번역 대상 — 신규 ${created} · 갱신 ${updated} · 유지 ${TRANSLATABLE.length - created - updated}`
  )
  logger.info(
    `[translation] 완료.\n` +
      `  확인: curl "http://localhost:9000/store/locales" -H "x-publishable-api-key: <pk_...>"\n` +
      `  관리자: /admin/translations 로 엔티티별 번역을 입력합니다.`
  )
}

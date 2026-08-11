// 약관·개인정보처리방침 영문본 시드 (2026-08-11 신설) — 재실행 안전(멱등)
//
// ── 왜 별도 스크립트인가 ────────────────────────────────────────────────────
// 다른 콘텐츠 번역(`seed-content-en.ts`)은 "원문 → 번역" 사전을 들고 있는데,
// 약관은 본문이 길고 문서 단위로 통째로 갈아 끼우는 성격이라 따로 둔다.
//
// ── ⚠️ 법적 효력 ────────────────────────────────────────────────────────────
// **이 영문본은 참고용 번역이다.** 한국 전자상거래법상 효력을 갖는 것은 한국어 원문이며,
// 실제 운영 전에는 반드시 법무 검토를 거쳐야 한다. 화면에도 그 사실을 함께 노출한다.
//
// ── 실행 ────────────────────────────────────────────────────────────────────
//   npx medusa exec ./src/scripts/seed-legal-en.ts
//   SEED_EN_OVERWRITE=true 로 실행하면 기존 번역을 덮어쓴다.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const LOCALE = "en-US"
const OVERWRITE = process.env.SEED_EN_OVERWRITE === "true"

/** 문서 종류(legal_doc.type) → 영문 본문 */
const BODIES: Record<string, string> = {
  terms_of_service: `Article 1 (Purpose)
These Terms govern the rights, obligations and responsibilities of the Company and users in relation to the e-commerce services provided through the online shop operated by [Company Name] (the "Company").

Article 2 (Definitions)
1. "Shop" means the virtual place of business the Company has set up using information and communications facilities in order to supply goods or services to users.
2. "User" means both members and non-members who access the Shop and receive the services the Company provides under these Terms.

Article 3 (Publication and Amendment of Terms)
1. The Company posts these Terms on the initial service screen of the Shop so that users can see them easily.
2. The Company may amend these Terms within the limits of applicable law, including the Act on Consumer Protection in Electronic Commerce and the Act on the Regulation of Terms and Conditions. Amendments are announced at least 7 days before they take effect, stating the effective date and the reason for the change.

Article 4 (Orders and Formation of Contract)
A contract is formed when the Company sends an acknowledgement of the user's purchase request and that acknowledgement reaches the user.

Article 5 (Withdrawal of Subscription)
1. A user may withdraw a subscription within 7 days of receiving the goods.
2. Withdrawal may be restricted where grounds set out in the Act on Consumer Protection in Electronic Commerce apply — for example, where the goods have been damaged, used or partly consumed, or where resale has become difficult with the passage of time.

Article 6 (Delivery)
The Company arranges for delivery of purchased goods to begin, as a rule, within 2 to 3 business days of the date payment is completed.

Article 7 (Exemption and Dispute Resolution)
The Company is relieved of liability where it cannot provide the service due to force majeure such as natural disaster. Disputes relating to use of the service are handled in accordance with applicable law and commercial practice.

Addendum: These Terms take effect on 1 July 2026.
※ This document is a standard template. It requires legal review before it is put into actual use. This English text is a reference translation; the Korean original prevails.`,

  privacy_policy: `[Company Name] (the "Company") complies with the Personal Information Protection Act and other applicable laws, and establishes and discloses this Privacy Policy as follows.

1. Personal information collected
- Required: email address, password (stored encrypted), name, mobile phone number, delivery address
- Collected automatically: access IP address, cookies, service usage records

2. Purpose of collection and use
Membership registration and management; orders, payment and delivery; customer support and complaint handling; marketing and event information (where consent is given).

3. Retention and use period
Personal information is destroyed without delay when a member closes their account. However, records required by the Act on Consumer Protection in Electronic Commerce and other laws are retained for the periods prescribed: records of contracts and subscription withdrawals (5 years), records of payment and supply of goods (5 years), and records of consumer complaints and dispute resolution (3 years).

4. Provision to third parties
As a rule the Company does not provide users' personal information to outside parties. Where it is necessary to perform the service — delivery, for example — the minimum necessary information may be entrusted to a processor.

5. Rights of users
Users may at any time request access to, correction of, deletion of, or suspension of processing of their personal information.

6. Personal information protection officer
Contact details are published in the footer of the Shop.

※ This English text is a reference translation. The Korean original prevails, and this document requires legal review before it is put into actual use.`,
}

export default async function seedLegalEn({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let translationSvc: any
  try {
    translationSvc = container.resolve("translation")
  } catch {
    logger.error("[legal-en] 번역 모듈이 없습니다 — featureFlags.translation 을 확인하세요.")
    return
  }

  let legalSvc: any
  try {
    legalSvc = container.resolve("legalDoc")
  } catch {
    logger.error("[legal-en] legal-doc 모듈을 찾지 못했습니다.")
    return
  }

  const docs: any[] = await legalSvc.listLegalDocs({ status: "published" })
  if (!docs.length) {
    logger.warn("[legal-en] 게시된 약관이 없습니다 — seed-cs-legal.ts 를 먼저 실행하세요.")
    return
  }

  // QA 자동화가 만든 문서는 번역 대상이 아니다.
  // 이런 게 게시본으로 남아 있으면 **거기에 영문본이 붙어** 진짜 약관은 영어가 없는 상태가 된다
  // (2026-08-11 실제로 발생 — qa008-… 버전에 영문본이 붙었다).
  // 근본 원인(QA 테스트가 약관을 게시하던 것)은 따로 고쳤고, 여기서도 한 번 더 막는다.
  const QA_VERSION = /^qa\d/i
  const real = docs.filter((d: any) => !QA_VERSION.test(String(d.version ?? "")))
  const skipped = docs.length - real.length
  if (skipped) {
    logger.warn(
      `[legal-en] QA 테스트 약관 ${skipped}건 제외 — 정리하려면 CLEANUP_APPLY=true npx medusa exec ./src/scripts/cleanup-test-data.ts`
    )
  }

  // 같은 종류가 여러 버전이면 **가장 최근 게시본**만 번역한다(화면에 뜨는 것이 그것이다)
  const latestByType = new Map<string, any>()
  for (const d of real) {
    const cur = latestByType.get(d.type)
    const t = (x: any) => new Date(x?.published_at ?? x?.created_at ?? 0).getTime()
    if (!cur || t(d) > t(cur)) latestByType.set(d.type, d)
  }

  let created = 0
  let updated = 0
  let kept = 0
  for (const [type, doc] of latestByType) {
    const body = BODIES[type]
    if (!body) {
      logger.info(`[legal-en] ${type} — 영문본 없음(건너뜀)`)
      continue
    }

    const existing: any[] = await translationSvc.listTranslations({
      reference: "legal_doc",
      reference_id: doc.id,
      locale_code: LOCALE,
    })

    if (existing.length) {
      if (!OVERWRITE) {
        kept++
        continue
      }
      await translationSvc.updateTranslations([{ id: existing[0].id, translations: { body } }])
      updated++
      continue
    }

    await translationSvc.createTranslations([
      {
        reference: "legal_doc",
        reference_id: doc.id,
        locale_code: LOCALE,
        translations: { body },
      },
    ])
    created++
    logger.info(`[legal-en]   + ${type} (${doc.version}) — 영문본 ${body.length}자`)
  }

  logger.info(`[legal-en] 완료 — 신규 ${created} · 갱신 ${updated} · 유지 ${kept}`)
  if (kept && !OVERWRITE) {
    logger.info("[legal-en] 기존 번역은 그대로 뒀습니다. 덮으려면 SEED_EN_OVERWRITE=true")
  }
  logger.warn(
    "[legal-en] ⚠️ 영문본은 **참고용 번역**입니다. 법적 효력은 한국어 원문에 있으며, 운영 전 법무 검토가 필요합니다."
  )
}

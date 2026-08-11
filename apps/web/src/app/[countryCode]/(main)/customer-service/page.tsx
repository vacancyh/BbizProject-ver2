import { Metadata } from "next"

import { BIZ } from "@lib/business-info"
import { listFaqs, listNotices } from "@lib/data/cs"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SupportInquiryForm from "@modules/common/components/support-inquiry-form"
import { getT, getUiLocale } from "@lib/i18n"
import { formatDate } from "@lib/util/format-date"

// 정적 metadata 로는 언어를 못 읽는다(쿠키를 봐야 한다) → generateMetadata 로 바꾼다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("cs.title"), description: t("cs.metaDescription") }
}

export default async function CustomerServicePage() {
  const t = await getT()
  const uiLocale = await getUiLocale()

  const [notices, faqs] = await Promise.all([listNotices(), listFaqs()])

  return (
    <div className="content-container py-12 small:py-20 max-w-3xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-2">
        {t("cs.title")}
      </h1>
      <p className="text-base-regular text-ui-fg-subtle mb-12">
        {t("cs.subtitle")}
      </p>

      {/* 1:1 문의 안내 */}
      <section className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-12">
        <h2 className="text-large-semi mb-2">{t("cs.inquiry")}</h2>
        {/* 연락처는 하드코딩 금지 — 푸터와 같은 출처(@lib/business-info)를 쓴다.
            예전에는 여기만 하드코딩이라 env 를 다 채워도 예시 번호가 노출됐다(2026-08-04). */}
        <p className="text-base-regular text-ui-fg-subtle">
          {t("footer.phone")}{" "}
          <span className="text-ui-fg-base font-semibold">{BIZ.csPhone}</span>{" "}
          ({BIZ.csHours || t("biz.csHoursDefault")})
        </p>
        <p className="text-base-regular text-ui-fg-subtle mb-4">
          {t("cs.email")} {BIZ.csEmail} · {BIZ.csClosed || t("biz.csClosedDefault")}
        </p>
        <SupportInquiryForm />
      </section>

      {/* 공지사항 */}
      <section className="mb-12" data-testid="cs-notices">
        <h2 className="text-large-semi mb-4">{t("cs.notices")}</h2>
        {/* 비었을 때 제목만 남고 아래가 텅 비면 고장으로 보인다 → 명시적으로 안내한다.
            (2026-08-03: 예전에는 비면 데모용 가짜 공지를 채웠는데, 운영에서는 그게 더 위험하다) */}
        {notices.length === 0 && (
          <p
            className="py-8 text-center text-small-regular text-ui-fg-muted"
            data-testid="cs-notices-empty"
          >
            {t("cs.noNotices")}
          </p>
        )}
        <ul className="flex flex-col divide-y divide-ui-border-base">
          {notices.map((n) => (
            <li key={n.id} className="py-4">
              <div className="flex items-center gap-x-2">
                {n.pinned && (
                  <span className="text-small-regular rounded-rounded bg-ui-tag-orange-bg text-ui-tag-orange-text px-2 py-0.5">
                    {t("cs.important")}
                  </span>
                )}
                <span className="text-base-regular text-ui-fg-base font-medium">
                  {n.title}
                </span>
                <span className="ml-auto text-small-regular text-ui-fg-muted shrink-0">
                  {formatDate(uiLocale, n.created_at)}
                </span>
              </div>
              <p className="text-small-regular text-ui-fg-subtle mt-2 leading-relaxed">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 자주 묻는 질문 */}
      <section data-testid="cs-faqs">
        <h2 className="text-large-semi mb-4">{t("cs.faqs")}</h2>
        {faqs.length === 0 && (
          <p
            className="py-8 text-center text-small-regular text-ui-fg-muted"
            data-testid="cs-faqs-empty"
          >
            {t("cs.noFaqs")}
          </p>
        )}
        <ul className="flex flex-col divide-y divide-ui-border-base">
          {faqs.map((f) => (
            <li key={f.id} className="py-1">
              <details className="group py-3">
                <summary className="flex items-center gap-x-2 cursor-pointer list-none">
                  <span className="text-small-regular text-ui-fg-muted shrink-0">
                    [{f.category}]
                  </span>
                  <span className="text-base-regular text-ui-fg-base">
                    {f.question}
                  </span>
                  <span className="ml-auto text-ui-fg-muted transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>
                <p className="text-small-regular text-ui-fg-subtle mt-3 leading-relaxed pl-1">
                  {f.answer}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 text-small-regular text-ui-fg-muted">
        {t("cs.relatedLinks")}{" "}
        <LocalizedClientLink
          href="/content/terms-of-use"
          className="underline hover:text-ui-fg-base"
        >
          {t("account.termsOfUse")}
        </LocalizedClientLink>{" "}
        ·{" "}
        <LocalizedClientLink
          href="/content/privacy-policy"
          className="underline hover:text-ui-fg-base"
        >
          {t("account.privacyPolicy")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

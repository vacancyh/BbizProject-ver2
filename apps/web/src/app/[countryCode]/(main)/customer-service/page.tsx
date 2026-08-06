import { Metadata } from "next"

import { BIZ } from "@lib/business-info"
import { listFaqs, listNotices } from "@lib/data/cs"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SupportInquiryForm from "@modules/common/components/support-inquiry-form"

export const metadata: Metadata = {
  title: "고객센터",
  description: "공지사항, 자주 묻는 질문, 1:1 문의 안내",
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))

export default async function CustomerServicePage() {
  const [notices, faqs] = await Promise.all([listNotices(), listFaqs()])

  return (
    <div className="content-container py-12 small:py-20 max-w-3xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-2">
        고객센터
      </h1>
      <p className="text-base-regular text-ui-fg-subtle mb-12">
        궁금하신 점을 빠르게 해결해 드립니다.
      </p>

      {/* 1:1 문의 안내 */}
      <section className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 mb-12">
        <h2 className="text-large-semi mb-2">1:1 문의</h2>
        {/* 연락처는 하드코딩 금지 — 푸터와 같은 출처(@lib/business-info)를 쓴다.
            예전에는 여기만 하드코딩이라 env 를 다 채워도 예시 번호가 노출됐다(2026-08-04). */}
        <p className="text-base-regular text-ui-fg-subtle">
          전화 <span className="text-ui-fg-base font-semibold">{BIZ.csPhone}</span>{" "}
          ({BIZ.csHours})
        </p>
        <p className="text-base-regular text-ui-fg-subtle mb-4">
          이메일 {BIZ.csEmail} · {BIZ.csClosed}
        </p>
        <SupportInquiryForm />
      </section>

      {/* 공지사항 */}
      <section className="mb-12" data-testid="cs-notices">
        <h2 className="text-large-semi mb-4">공지사항</h2>
        {/* 비었을 때 제목만 남고 아래가 텅 비면 고장으로 보인다 → 명시적으로 안내한다.
            (2026-08-03: 예전에는 비면 데모용 가짜 공지를 채웠는데, 운영에서는 그게 더 위험하다) */}
        {notices.length === 0 && (
          <p
            className="py-8 text-center text-small-regular text-ui-fg-muted"
            data-testid="cs-notices-empty"
          >
            등록된 공지사항이 없습니다.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-ui-border-base">
          {notices.map((n) => (
            <li key={n.id} className="py-4">
              <div className="flex items-center gap-x-2">
                {n.pinned && (
                  <span className="text-small-regular rounded-rounded bg-ui-tag-orange-bg text-ui-tag-orange-text px-2 py-0.5">
                    중요
                  </span>
                )}
                <span className="text-base-regular text-ui-fg-base font-medium">
                  {n.title}
                </span>
                <span className="ml-auto text-small-regular text-ui-fg-muted shrink-0">
                  {formatDate(n.created_at)}
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
        <h2 className="text-large-semi mb-4">자주 묻는 질문</h2>
        {faqs.length === 0 && (
          <p
            className="py-8 text-center text-small-regular text-ui-fg-muted"
            data-testid="cs-faqs-empty"
          >
            등록된 질문이 없습니다. 궁금한 점은 고객센터로 문의해 주세요.
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
        관련 안내:{" "}
        <LocalizedClientLink
          href="/content/terms-of-use"
          className="underline hover:text-ui-fg-base"
        >
          이용약관
        </LocalizedClientLink>{" "}
        ·{" "}
        <LocalizedClientLink
          href="/content/privacy-policy"
          className="underline hover:text-ui-fg-base"
        >
          개인정보처리방침
        </LocalizedClientLink>
      </div>
    </div>
  )
}

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLegalDoc } from "@lib/data/legal"
import { getT, getUiLocale } from "@lib/i18n"
import type { MessageKey } from "@lib/i18n/messages"
import { formatDate } from "@lib/util/format-date"

type Props = {
  params: Promise<{ slug: string; countryCode: string }>
}

/**
 * 문서 제목은 **UI 라벨**로 다룬다.
 *
 * 백엔드는 slug 별로 한국어 제목("이용약관")을 고정 매핑해 내려준다. 그 값을 그대로 쓰면
 * 영어 화면에서도 제목만 한국어로 남는다. 문서 종류는 두 가지로 고정이고 운영자가
 * 바꿀 값이 아니므로, 사전에서 꺼내 쓰는 편이 맞다. 모르는 slug 면 API 제목으로 떨어진다.
 */
const TITLE_KEY: Record<string, MessageKey> = {
  "terms-of-use": "account.termsOfUse",
  "privacy-policy": "account.privacyPolicy",
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const t = await getT()
  const doc = await getLegalDoc(slug)
  if (!doc) {
    return { title: t("error.docNotFound") }
  }
  const title = TITLE_KEY[slug] ? t(TITLE_KEY[slug]) : doc.title
  return { title, description: title }
}

export default async function ContentPage(props: Props) {
  const t = await getT()
  const locale = await getUiLocale()
  const { slug } = await props.params
  const doc = await getLegalDoc(slug)

  if (!doc) {
    notFound()
  }

  const title = TITLE_KEY[slug] ? t(TITLE_KEY[slug]) : doc.title

  return (
    <div className="content-container py-12 small:py-20 max-w-3xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base">
        {title}
      </h1>
      <p className="text-small-regular text-ui-fg-muted mt-2 mb-10">
        {t("legal.effectiveFrom", { date: formatDate(locale, doc.effective_at) })}
      </p>
      <div className="text-base-regular text-ui-fg-subtle leading-relaxed whitespace-pre-line">
        {doc.body}
      </div>
      {/*
        번역본은 참고용이다 — 한국 전자상거래법상 효력은 한국어 원문에 있다.
        영어로 보고 있을 때만 알린다(한국어 화면에서는 원문 자체라 안내가 불필요).
      */}
      {locale !== "ko" && (
        <p className="mt-10 border-t border-ui-border-base pt-4 text-small-regular text-ui-fg-muted">
          {t("legal.translationNotice")}
        </p>
      )}
    </div>
  )
}

import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLegalDoc } from "@lib/data/legal"

type Props = {
  params: Promise<{ slug: string; countryCode: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const doc = await getLegalDoc(slug)
  if (!doc) {
    return { title: "문서를 찾을 수 없습니다" }
  }
  return { title: doc.title, description: `${doc.title} 안내` }
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))

export default async function ContentPage(props: Props) {
  const { slug } = await props.params
  const doc = await getLegalDoc(slug)

  if (!doc) {
    notFound()
  }

  return (
    <div className="content-container py-12 small:py-20 max-w-3xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base">
        {doc.title}
      </h1>
      <p className="text-small-regular text-ui-fg-muted mt-2 mb-10">
        시행일 {formatDate(doc.effective_at)}
      </p>
      <div className="text-base-regular text-ui-fg-subtle leading-relaxed whitespace-pre-line">
        {doc.body}
      </div>
    </div>
  )
}

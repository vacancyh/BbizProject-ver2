"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

import { useUiLocale } from "@lib/i18n/client"
import { withLocalePrefix } from "@lib/i18n/routing"

/**
 * 국가코드와 **언어**를 주소에 유지해 주는 링크.
 *
 *   href="/store"  →  /kr/store        (한국어)
 *   href="/store"  →  /en/kr/store     (영어)
 *
 * ── 왜 언어까지 붙이나 (2026-08-12) ─────────────────────────────────────────
 * 언어가 주소에 담기게 바뀌었다. 링크가 접두사를 안 물고 가면 **한 번 클릭할 때마다
 * 한국어로 되돌아간다.** 이 앱의 내부 링크는 전부 이 컴포넌트를 거치므로
 * (`next/link` 직접 사용처는 여기 하나뿐) 여기서 처리하면 전부 따라온다.
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  [x: string]: unknown
}) => {
  const { countryCode } = useParams()
  const locale = useUiLocale()

  return (
    <Link href={withLocalePrefix(locale, `/${countryCode}${href}`)} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink

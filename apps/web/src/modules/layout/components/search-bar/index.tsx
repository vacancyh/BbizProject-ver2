"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { useT, useUiLocale } from "@lib/i18n/client"
import { withLocalePrefix } from "@lib/i18n/routing"

const SearchBar = () => {
  const t = useT()
  const locale = useUiLocale()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()
  const [term, setTerm] = useState(searchParams.get("q") ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    // 언어 접두사를 빠뜨리면 검색 한 번에 한국어로 되돌아간다(2026-08-12)
    router.push(
      withLocalePrefix(locale, `/${countryCode}/store?q=${encodeURIComponent(q)}`)
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden small:flex items-center gap-x-2 border-b border-ui-border-base focus-within:border-ui-fg-base transition-colors px-1 py-1"
      data-testid="search-bar"
    >
      <MagnifyingGlass className="text-ui-fg-muted" />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={t("nav.searchPlaceholder")}
        aria-label={t("nav.searchPlaceholder")}
        className="bg-transparent outline-none text-small-regular w-40 placeholder:text-ui-fg-muted"
        data-testid="search-input"
      />
    </form>
  )
}

export default SearchBar

"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { useT } from "@lib/i18n/client"

const SearchBar = () => {
  const t = useT()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()
  const [term, setTerm] = useState(searchParams.get("q") ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    router.push(`/${countryCode}/store?q=${encodeURIComponent(q)}`)
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

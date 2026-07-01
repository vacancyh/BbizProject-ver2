"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const KEY = "_recent_searches"
const MAX = 8

// 인기 검색어(큐레이션) — 운영 시 관리자 관리/집계로 교체 가능.
const POPULAR = ["티셔츠", "니트", "패딩", "셔츠", "벨트", "바지", "가디건"]

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

/** 검색 제안 — 최근 검색어(localStorage) + 인기 검색어. currentQuery 있으면 최근에 기록. */
const SearchSuggestions = ({ currentQuery }: { currentQuery?: string }) => {
  const { countryCode } = useParams() as { countryCode: string }
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    let list = readRecent()
    const q = (currentQuery ?? "").trim()
    if (q) {
      list = [q, ...list.filter((t) => t !== q)].slice(0, MAX)
      try {
        window.localStorage.setItem(KEY, JSON.stringify(list))
      } catch {
        // ignore
      }
    }
    setRecent(list)
  }, [currentQuery])

  const clearRecent = () => {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    setRecent([])
  }

  const Chip = ({ term }: { term: string }) => (
    <LocalizedClientLink
      href={`/store?q=${encodeURIComponent(term)}`}
      className="inline-flex items-center h-8 px-3 rounded-full border border-ui-border-base text-small-regular text-ui-fg-subtle hover:border-ui-fg-base hover:text-ui-fg-base transition-colors"
      data-testid="search-chip"
    >
      {term}
    </LocalizedClientLink>
  )

  return (
    <div className="mb-6 flex flex-col gap-y-3" data-testid="search-suggestions">
      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small-regular text-ui-fg-muted mr-1">
            최근 검색어
          </span>
          {recent.map((t) => (
            <Chip key={"r-" + t} term={t} />
          ))}
          <button
            type="button"
            onClick={clearRecent}
            className="text-xsmall-regular text-ui-fg-muted underline ml-1"
            data-testid="clear-recent-searches"
          >
            지우기
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small-regular text-ui-fg-muted mr-1">
          인기 검색어
        </span>
        {POPULAR.map((t) => (
          <Chip key={"p-" + t} term={t} />
        ))}
      </div>
    </div>
  )
}

export default SearchSuggestions

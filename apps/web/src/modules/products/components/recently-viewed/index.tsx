"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type RecentItem = {
  id: string
  handle: string
  title: string
  thumbnail: string | null
}

const KEY = "_recently_viewed"
import { useT } from "@lib/i18n/client"
const MAX = 12

function read(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function write(items: RecentItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)))
  } catch {
    // ignore
  }
}

/**
 * 최근 본 상품 — localStorage 기반(무비용, 비회원 포함).
 * current 가 주어지면(상품 상세) 목록에 기록하고, current 를 제외한 나머지를 노출한다.
 * current 없으면(홈 등) 표시 전용.
 */
const RecentlyViewed = ({
  current,
  title,
}: {
  current?: RecentItem
  title?: string
}) => {
  const t = useT()
  const [items, setItems] = useState<RecentItem[]>([])
  // 호출부가 제목을 안 주면 언어에 맞는 기본 제목을 쓴다
  const heading = title ?? t("product.recentlyViewed")

  useEffect(() => {
    let list = read()
    if (current?.id && current.handle) {
      list = [current, ...list.filter((i) => i.id !== current.id)].slice(0, MAX)
      write(list)
    }
    setItems(list.filter((i) => i.id !== current?.id))
    // current 객체 자체를 의존성에 넣으면 매 렌더마다 아이덴티티가 바뀌어 무한 재실행된다.
    // 값이 실제로 바뀌는 id/handle 만 추적하는 것이 의도된 동작.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.handle])

  if (items.length === 0) return null

  return (
    <div className="content-container my-12" data-testid="recently-viewed">
      <h3 className="text-large-semi mb-4">{heading}</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((it) => (
          <LocalizedClientLink
            key={it.id}
            href={`/products/${it.handle}`}
            className="flex-shrink-0 w-32"
            data-testid="recent-item"
          >
            <div className="aspect-square bg-ui-bg-subtle rounded-rounded overflow-hidden">
              {it.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.thumbnail}
                  alt={it.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="text-small-regular text-ui-fg-base mt-2 line-clamp-2">
              {it.title}
            </p>
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

export default RecentlyViewed

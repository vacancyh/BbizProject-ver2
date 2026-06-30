"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Banner } from "@lib/data/banners"

const dismissKey = (id: string) => `popup_dismiss_${id}`

/** 홈 진입 팝업 — 첫 팝업 배너 1건 노출. "오늘 하루 보지 않기" 시 당일 자정까지 숨김(localStorage). */
const HomePopup = ({ banners }: { banners: Banner[] }) => {
  const banner = banners[0]
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!banner) return
    try {
      const until = window.localStorage.getItem(dismissKey(banner.id))
      if (until && Number(until) > Date.now()) return
    } catch {
      // ignore
    }
    setOpen(true)
  }, [banner])

  if (!banner || !open) return null

  const dismissToday = () => {
    try {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      window.localStorage.setItem(dismissKey(banner.id), String(end.getTime()))
    } catch {
      // ignore
    }
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      data-testid="home-popup"
    >
      <div className="bg-white rounded-rounded overflow-hidden max-w-sm w-full">
        <LocalizedClientLink
          href={(banner.link_url ?? "/").replace(/^\/[a-z]{2}/, "") || "/"}
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full h-auto object-cover"
          />
          <div className="p-4 text-center text-base-semi text-ui-fg-base">
            {banner.title}
          </div>
        </LocalizedClientLink>
        <div className="flex border-t border-ui-border-base text-small-regular">
          <button
            type="button"
            className="flex-1 py-3 text-ui-fg-subtle hover:bg-ui-bg-subtle"
            onClick={dismissToday}
            data-testid="popup-dismiss-today"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            className="flex-1 py-3 border-l border-ui-border-base text-ui-fg-base hover:bg-ui-bg-subtle"
            onClick={() => setOpen(false)}
            data-testid="popup-close"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomePopup

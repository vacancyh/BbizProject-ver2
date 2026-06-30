"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Heading } from "@modules/common/components/ui"
import type { Banner } from "@lib/data/banners"

/** 메인 hero 배너 캐러셀 — 자동 회전 + 도트 네비. 이미지는 <img>(외부 URL). */
const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  const [idx, setIdx] = useState(0)
  const count = banners.length

  useEffect(() => {
    if (count <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 5000)
    return () => clearInterval(t)
  }, [count])

  if (!count) return null
  const b = banners[idx]

  const inner = (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.image_url}
        alt={b.title}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center gap-6 p-8">
        <Heading
          level="h1"
          className="text-3xl small:text-5xl leading-tight text-white font-semibold tracking-tight drop-shadow"
        >
          {b.title}
        </Heading>
        <Button className="rounded-none px-8 h-12 text-base pointer-events-none">
          지금 쇼핑하기
        </Button>
      </div>
    </div>
  )

  return (
    <div
      className="h-[60vh] small:h-[72vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle overflow-hidden"
      data-testid="hero-carousel"
    >
      {b.link_url ? (
        <LocalizedClientLink href={b.link_url.replace(/^\/[a-z]{2}/, "")}>
          {inner}
        </LocalizedClientLink>
      ) : (
        inner
      )}

      {count > 1 && (
        <div className="absolute bottom-5 inset-x-0 z-20 flex justify-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`배너 ${i + 1}`}
              onClick={() => setIdx(i)}
              className={
                "h-2 w-2 rounded-full transition-colors " +
                (i === idx ? "bg-white" : "bg-white/50")
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroCarousel

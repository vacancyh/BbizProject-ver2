"use client"

import { useT } from "@lib/i18n/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Heading } from "@modules/common/components/ui"
import type { Banner } from "@lib/data/banners"

/**
 * 메인 hero 배너 캐러셀 — 자동 회전 + 도트 네비.
 *
 * 2026-08-03: 원본 <img> → next/image 로 전환.
 * 히어로는 화면에서 가장 큰 이미지이자 **LCP 요소**다. 최적화를 거치지 않으면
 * 원본 PNG(실측 928KB)가 그대로 내려가 모바일 첫 화면이 눈에 띄게 느려진다.
 * 전환 후 같은 이미지가 AVIF 11KB 로 줄었다(99% 절감).
 *
 * ⚠️ 배너 이미지 호스트는 next.config.js 의 images.remotePatterns 에 있어야 한다.
 *    없는 호스트를 관리자에서 등록하면 히어로가 깨진다 — 운영 스토리지 확정 시 함께 등록할 것.
 */
const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  const t = useT()
  const [idx, setIdx] = useState(0)
  const count = banners.length

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(() => setIdx((i) => (i + 1) % count), 5000)
    return () => clearInterval(timer)
  }, [count])

  if (!count) return null
  const b = banners[idx]

  const inner = (
    <div className="absolute inset-0">
      <Image
        src={b.image_url}
        alt={b.title}
        fill
        // 히어로는 첫 화면에 바로 보이므로 lazy 로딩하면 안 된다(LCP 지연).
        priority={idx === 0}
        sizes="100vw"
        className="object-cover"
      />
      {/* 배너 이미지가 밝아도 흰 텍스트 가독성 확보: 어두운 오버레이 + 하단 그라데이션 */}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center gap-6 p-8">
        <Heading
          level="h1"
          className="text-3xl small:text-5xl leading-tight text-white font-semibold tracking-tight drop-shadow"
        >
          {b.title}
        </Heading>
        <Button className="rounded-none px-8 h-12 text-base pointer-events-none">
          {t("home.shopNow")}
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

      {/* 점은 8px 로 보이되 **누르는 영역은 24px** 로 넓힌다.
          버튼 자체를 8×8 로 두면 모바일에서 사실상 못 누른다(WCAG 2.5.8 최소 24×24).
          gap 을 줄여 시각적 간격은 그대로 유지한다. (2026-08-06 실측으로 발견) */}
      {count > 1 && (
        <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-0">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("home.bannerAria", { n: i + 1 })}
              aria-current={i === idx ? "true" : undefined}
              onClick={() => setIdx(i)}
              className="grid h-6 w-6 place-items-center"
            >
              <span
                aria-hidden="true"
                className={
                  "block h-2 w-2 rounded-full transition-colors " +
                  (i === idx ? "bg-white" : "bg-white/50")
                }
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroCarousel

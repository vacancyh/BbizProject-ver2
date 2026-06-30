import { Button, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { listBanners } from "@lib/data/banners"
import HeroCarousel from "./hero-carousel"

const Hero = async () => {
  // 관리자 등록 메인 배너가 있으면 캐러셀, 없으면 기본 정적 hero
  const banners = await listBanners("hero")
  if (banners.length > 0) {
    return <HeroCarousel banners={banners} />
  }

  return (
    <div className="h-[72vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-8">
        <span className="flex flex-col gap-3">
          <Heading
            level="h1"
            className="text-4xl small:text-5xl leading-tight text-ui-fg-base font-semibold tracking-tight"
          >
            오늘의 발견,
            <br />
            당신의 취향에 맞게.
          </Heading>
          <Heading
            level="h2"
            className="text-base small:text-lg leading-relaxed text-ui-fg-subtle font-normal"
          >
            엄선한 상품을 합리적인 가격으로 만나보세요.
          </Heading>
        </span>
        <LocalizedClientLink href="/store">
          <Button className="rounded-none px-8 h-12 text-base">
            지금 쇼핑하기
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero

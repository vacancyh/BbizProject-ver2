import { getT } from "@lib/i18n"
import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import HomePopup from "@modules/home/components/home-popup"
import HomeCuration from "@modules/home/components/home-curation"
import BestProducts from "@modules/home/components/best-products"
import NewArrivals from "@modules/home/components/new-arrivals"
import TimeSaleSection from "@modules/home/components/time-sale"
import { listCollections } from "@lib/data/collections"
import { listBanners } from "@lib/data/banners"
import { getRegion } from "@lib/data/regions"
import { SiteJsonLd } from "@modules/common/components/structured-data"

// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("home.metaTitle"), description: t("home.metaDescription") }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  const popupBanners = await listBanners("popup")

  // 홈 전용 섹션(베스트/신상품)과 중복되는 컬렉션은 하단 레일에서 제외해 중복 노출 방지.
  const DUP_HANDLES = new Set(["best", "new"])
  const railCollections = collections.filter(
    (c) => !DUP_HANDLES.has((c.handle ?? "").toLowerCase())
  )

  return (
    <>
      {/* SEO(2026-07-28): Organization·WebSite 구조화 데이터 */}
      <SiteJsonLd countryCode={countryCode} />
      <HomePopup banners={popupBanners} />
      <Hero />
      <HomeCuration region={region} />
      <BestProducts region={region} />
      <TimeSaleSection countryCode={countryCode} region={region} />
      <NewArrivals region={region} />
      {railCollections.length > 0 && (
        <div className="py-12">
          <ul className="flex flex-col gap-x-6">
            <FeaturedProducts collections={railCollections} region={region} />
          </ul>
        </div>
      )}
    </>
  )
}

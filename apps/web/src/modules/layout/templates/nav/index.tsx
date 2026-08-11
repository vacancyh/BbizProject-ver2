import { Suspense } from "react"

import { BIZ } from "@lib/business-info"
import { getT } from "@lib/i18n"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SearchBar from "@modules/layout/components/search-bar"
import LanguageSwitcher from "@modules/layout/components/language-switcher"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const t = await getT()
  const [regions, locales, currentLocale, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories().catch(() => []),
  ])

  // admin 관리 카테고리 중 상위 + 상품이 있는 것만 메뉴에 노출(빈 테스트 카테고리 제외)
  const topCategories = (categories ?? [])
    .filter(
      (c) =>
        !c.parent_category_id &&
        ((c.products?.length ?? 0) > 0 ||
          (c.category_children?.length ?? 0) > 0)
    )
    .slice(0, 8)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center">
            <div className="h-full">
              <SideMenu regions={regions} categories={topCategories} />
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ui-fg-base"
              data-testid="nav-store-link"
            >
              {BIZ.name || t("biz.nameSample")}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <SearchBar />
            {/* 언어 전환 — 사이드메뉴 안에 있어 찾기 어려웠다. 헤더로 올렸다(2026-08-10).
                모바일에서도 보이도록 small: 분기 밖에 둔다. */}
            {!!locales?.length && (
              <LanguageSwitcher locales={locales} currentLocale={currentLocale} />
            )}
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                {t("nav.account")}
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  {t("nav.cartWithCount", { count: 0 })}
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}

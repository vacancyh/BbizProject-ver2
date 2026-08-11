"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { clx } from "@modules/common/components/ui"

import { useT } from "@lib/i18n/client"
import { PRICE_RANGES, type FilterCategory } from "./filter-config"

export type { FilterCategory }

/**
 * 상품 목록 필터 (2026-07-29 신설)
 *
 * 이전에는 사이드바에 '정렬'만 있어, 상품이 늘어나면 원하는 상품을 찾을 방법이 없었다.
 * 카테고리(서버 필터)와 가격대(계산가 기준)를 URL 쿼리로 관리해 새로고침·공유에도 유지되게 한다.
 */
/**
 * 필터 버튼 공통 클래스.
 *
 * 글자만 있는 버튼이라 높이가 **20px** 밖에 안 됐다. 한국어("전체")일 때는 폭이 넓어
 * 넘어갔지만 영어("All")로 바꾸니 **15×20** 이 되어 모바일에서 사실상 못 누른다
 * (WCAG 2.5.8 최소 24×24). 글자 크기는 그대로 두고 **누르는 영역만** 24px 로 넓힌다.
 * — 2026-08-11, 영어 전환 후 레이아웃 검사에서 잡힘
 */
const FILTER_BTN =
  "txt-compact-small text-left hover:text-ui-fg-base transition-colors " +
  "inline-flex items-center min-h-6 min-w-6"

const ProductFilters = ({ categories }: { categories: FilterCategory[] }) => {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get("category") ?? ""
  const currentPrice = searchParams.get("price") ?? "all"

  const apply = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (!value || value === "all") params.delete(name)
    else params.set(name, value)
    params.delete("page") // 필터가 바뀌면 1페이지부터
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const hasFilter = !!currentCategory || currentPrice !== "all"

  return (
    <div className="flex flex-col gap-y-8" data-testid="product-filters">
      {categories.length > 0 && (
        <div className="flex flex-col gap-y-3">
          <span className="txt-compact-small-plus text-ui-fg-base">{t("nav.categories")}</span>
          <ul className="flex small:flex-col gap-2 small:gap-1 flex-wrap">
            <li>
              <button
                type="button"
                onClick={() => apply("category", "")}
                className={clx(
                  FILTER_BTN,
                  !currentCategory ? "text-ui-fg-base font-medium" : "text-ui-fg-subtle"
                )}
              >
                {t("store.filterAll")}
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => apply("category", c.handle)}
                  className={clx(
                    FILTER_BTN,
                    currentCategory === c.handle
                      ? "text-ui-fg-base font-medium"
                      : "text-ui-fg-subtle"
                  )}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-y-3">
        <span className="txt-compact-small-plus text-ui-fg-base">{t("store.filter.price")}</span>
        <ul className="flex small:flex-col gap-2 small:gap-1 flex-wrap">
          {PRICE_RANGES.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => apply("price", r.key)}
                className={clx(
                  FILTER_BTN,
                  currentPrice === r.key
                    ? "text-ui-fg-base font-medium"
                    : "text-ui-fg-subtle"
                )}
              >
                {t(r.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams)
            params.delete("category")
            params.delete("price")
            params.delete("page")
            const qs = params.toString()
            router.push(qs ? `${pathname}?${qs}` : pathname)
          }}
          className="txt-compact-small text-ui-fg-subtle underline underline-offset-4 hover:text-ui-fg-base self-start"
          data-testid="clear-filters"
        >
          {t("store.filterReset")}
        </button>
      )}
    </div>
  )
}

export default ProductFilters

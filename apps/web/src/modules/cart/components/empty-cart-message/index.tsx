import { getT } from "@lib/i18n"
import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * 빈 장바구니 화면 (2026-07-29 개편)
 *
 * 이전: 상하 여백만 12rem 씩 잡힌 좌측 정렬 텍스트 3줄 → 화면이 휑하고 다음 행동이 잘 안 보였다.
 * 개편: 중앙 정렬 + 아이콘으로 상태를 즉시 알리고, **다음 행동(전체 상품·신상품)** 을 함께 제시한다.
 */
// 서버 컴포넌트 — 쿠키에서 언어를 읽어야 하므로 async 로 바뀌었다(2026-08-05 i18n 도입)
const EmptyCartMessage = async () => {
  const t = await getT()
  return (
    <div
      className="py-24 small:py-32 px-2 flex flex-col items-center text-center"
      data-testid="empty-cart-message"
    >
      <div
        className="w-16 h-16 rounded-full bg-ui-bg-subtle flex items-center justify-center mb-6 text-ui-fg-muted"
        aria-hidden="true"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>

      <Heading
        level="h1"
        className="text-2xl small:text-3xl font-semibold tracking-tight"
      >
        {t("cart.empty")}
      </Heading>

      <Text className="text-base-regular mt-3 mb-8 max-w-[28rem] text-ui-fg-subtle">
        {t("cart.emptyHint")}
      </Text>

      <div className="flex flex-col small:flex-row items-center gap-3">
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center justify-center h-11 px-6 rounded-rounded bg-ui-fg-base text-ui-bg-base txt-compact-medium-plus hover:opacity-90 transition-opacity"
          data-testid="empty-cart-browse"
        >
          {t("cart.browseAll")}
        </LocalizedClientLink>
        <InteractiveLink href="/store?sortBy=created_at">
          {t("cart.browseNew")}
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage

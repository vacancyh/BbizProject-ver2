import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * 빈 장바구니 화면 (2026-07-29 개편)
 *
 * 이전: 상하 여백만 12rem 씩 잡힌 좌측 정렬 텍스트 3줄 → 화면이 휑하고 다음 행동이 잘 안 보였다.
 * 개편: 중앙 정렬 + 아이콘으로 상태를 즉시 알리고, **다음 행동(전체 상품·신상품)** 을 함께 제시한다.
 */
const EmptyCartMessage = () => {
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
        장바구니가 비어 있습니다
      </Heading>

      <Text className="text-base-regular mt-3 mb-8 max-w-[28rem] text-ui-fg-subtle">
        마음에 드는 상품을 담아보세요. 로그인하면 담은 상품이 다음 방문에도 유지됩니다.
      </Text>

      <div className="flex flex-col small:flex-row items-center gap-3">
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center justify-center h-11 px-6 rounded-rounded bg-ui-fg-base text-ui-bg-base txt-compact-medium-plus hover:opacity-90 transition-opacity"
          data-testid="empty-cart-browse"
        >
          전체 상품 보기
        </LocalizedClientLink>
        <InteractiveLink href="/store?sortBy=created_at">
          신상품 둘러보기
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage

"use client"

import { clx } from "@modules/common/components/ui"
import { toggleWishlist } from "@lib/data/wishlist"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useT } from "@lib/i18n/client"

type WishlistButtonProps = {
  productId: string
  initialActive: boolean
  /** "overlay": 상품카드 위 둥근 버튼 · "inline": 상세 페이지 버튼 */
  variant?: "overlay" | "inline"
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const WishlistButton = ({
  productId,
  initialActive,
  variant = "overlay",
}: WishlistButtonProps) => {
  const t = useT()
  const router = useRouter()
  const [active, setActive] = useState(initialActive)
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !active
    setActive(next) // 낙관적 업데이트
    startTransition(async () => {
      await toggleWishlist(productId)
      router.refresh()
    })
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={active}
        data-testid="wishlist-button"
        className={clx(
          "flex items-center justify-center gap-x-2 h-12 px-4 border rounded-none transition-colors",
          active
            ? "border-ui-fg-base text-ui-fg-base"
            : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-muted"
        )}
      >
        <HeartIcon filled={active} />
        <span className="text-base">{active ? t("wishlist.added") : t("wishlist.add")}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={active}
      aria-label={active ? t("wishlist.remove") : t("wishlist.add")}
      data-testid="wishlist-button"
      className={clx(
        "absolute top-2 right-2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur transition-colors shadow-sm",
        active
          ? "text-ui-tag-red-text"
          : "text-ui-fg-muted hover:text-ui-fg-base"
      )}
    >
      <HeartIcon filled={active} />
    </button>
  )
}

export default WishlistButton

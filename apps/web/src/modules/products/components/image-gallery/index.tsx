"use client"

import { useT } from "@lib/i18n/client"
import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { clx } from "@modules/common/components/ui"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

/**
 * 상품 이미지 갤러리 (2026-07-29 개편)
 *
 * 이전: 모든 이미지를 원본 크기로 세로 나열 → 이미지가 5장이면 상세 페이지가 7,000px 를 넘어
 *       구매 버튼·리뷰가 한참 아래로 밀렸다.
 * 개편: **메인 1장 + 썸네일 목록**. 페이지 길이가 이미지 수와 무관해지고,
 *       구매 영역이 첫 화면에서 보인다.
 *
 * - 이미지가 1장이면 썸네일 줄을 숨긴다(불필요한 UI 제거).
 * - 모바일에서는 썸네일이 가로 스크롤(문서 가로 넘침 없음).
 * - 키보드 접근: 썸네일이 button 이라 Tab/Enter 로 전환 가능.
 */
const ImageGallery = ({ images }: ImageGalleryProps) => {
  const t = useT()
  // URL 없는 이미지 레코드는 빈 회색 박스로 렌더되어 큰 공백을 만드므로 제외.
  const validImages = images.filter((img) => !!img.url)
  const [active, setActive] = useState(0)

  const firstId = validImages[0]?.id
  // 다른 상품/변형으로 이동해 이미지 목록이 바뀌면 첫 장으로 되돌린다.
  useEffect(() => {
    setActive(0)
  }, [validImages.length, firstId])

  if (!validImages.length) {
    return (
      <div className="w-full aspect-[4/5] bg-ui-bg-subtle rounded-rounded flex items-center justify-center">
        <span className="text-ui-fg-muted text-small-regular">{t("product.imagePending")}</span>
      </div>
    )
  }

  const current = validImages[Math.min(active, validImages.length - 1)]

  return (
    <div className="flex flex-col gap-y-3 w-full" data-testid="product-gallery">
      {/* 메인 이미지 */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-rounded bg-ui-bg-subtle">
        <Image
          key={current.id}
          src={current.url}
          priority
          alt={t("product.imageAlt", { n: active + 1 })}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 700px"
          className="object-cover"
        />
      </div>

      {/* 썸네일 — 1장이면 숨김 */}
      {validImages.length > 1 && (
        <ul
          className="flex gap-x-2 overflow-x-auto pb-1"
          data-testid="product-gallery-thumbs"
        >
          {validImages.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={t("product.imageViewAria", { n: index + 1 })}
                aria-current={index === active}
                className={clx(
                  "relative block w-16 h-20 small:w-20 small:h-24 overflow-hidden rounded-md transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-base focus-visible:ring-offset-2",
                  index === active
                    ? "ring-2 ring-ui-fg-base"
                    : "ring-1 ring-ui-border-base opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ImageGallery

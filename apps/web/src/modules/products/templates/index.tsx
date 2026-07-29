import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import ProductDisclosureSection from "@modules/products/components/product-disclosure"
import ProductReviews from "@modules/products/components/product-reviews"
import ProductInquiries from "@modules/products/components/product-inquiries"
import RelatedProducts from "@modules/products/components/related-products"
import RecentlyViewed from "@modules/products/components/recently-viewed"
import ProductViewTracker from "@modules/products/components/view-tracker"
import ProductInfo from "@modules/products/templates/product-info"
import ProductWishlist from "@modules/wishlist/components/product-wishlist"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      {/*
        레이아웃 개편(2026-07-29)
        이전: [상품정보][이미지 전량 나열][구매박스] 3컬럼 — 좌·우가 좁고 가운데만 길어져
              시선이 흩어지고 페이지가 7,000px 를 넘었다.
        개편: **좌 갤러리 / 우 구매 정보** 2컬럼(모바일은 1컬럼).
              상품명·가격·옵션·담기를 한 화면에서 보이게 하고, 상세 설명(탭)은 갤러리 아래로 내렸다.
              우측 구매 박스는 sticky 라 길게 스크롤해도 따라온다.
      */}
      <div
        className="content-container flex flex-col small:flex-row small:items-start gap-x-10 gap-y-8 py-6 relative"
        data-testid="product-container"
      >
        {/* 좌: 갤러리 */}
        <div className="w-full small:w-[58%] flex flex-col gap-y-10">
          <ImageGallery images={images} />
        </div>

        {/* 우: 상품 정보 + 구매 */}
        <div className="w-full small:flex-1 small:sticky small:top-24 flex flex-col gap-y-8">
          <ProductInfo product={product} />
          <ProductOnboardingCta />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
          <Suspense fallback={null}>
            <ProductWishlist productId={product.id} />
          </Suspense>
        </div>
      </div>
      {/*
        상세 설명(탭)은 **구매 영역 아래**에 둔다.
        모바일에서는 컬럼이 세로로 쌓이므로, 좌측 컬럼에 두면 가격·옵션·담기보다 먼저 나와
        "설명부터 읽고 스크롤을 한참 내려야 구매"하는 순서가 된다(2026-07-29 수정).
      */}
      <div className="content-container mt-4 small:mt-8">
        <div className="small:max-w-[58%]">
          <ProductTabs product={product} />
        </div>
      </div>

      <div className="content-container my-16 small:my-32">
        <Suspense fallback={null}>
          <ProductDisclosureSection productId={product.id} />
        </Suspense>
      </div>
      <div className="content-container my-16 small:my-32">
        <Suspense fallback={null}>
          <ProductReviews productId={product.id} />
        </Suspense>
      </div>
      <div className="content-container my-16 small:my-32">
        <Suspense fallback={null}>
          <ProductInquiries productId={product.id} />
        </Suspense>
      </div>
      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
      <ProductViewTracker productId={product.id!} />
      <RecentlyViewed
        current={{
          id: product.id!,
          handle: product.handle!,
          title: product.title!,
          thumbnail: product.thumbnail ?? null,
        }}
      />
    </>
  )
}

export default ProductTemplate

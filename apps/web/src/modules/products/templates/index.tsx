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
      <div
        className="content-container  flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} />
          <ProductTabs product={product} />
        </div>
        <div className="block w-full relative">
          <ImageGallery images={images} />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
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

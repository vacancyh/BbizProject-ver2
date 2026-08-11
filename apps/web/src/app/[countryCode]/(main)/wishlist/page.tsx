import { Metadata } from "next"
import { getT } from "@lib/i18n"
import { notFound } from "next/navigation"

import { listWishlistProducts } from "@lib/data/wishlist"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("wishlist.title"), description: t("wishlist.metaDescription") }
}

export default async function WishlistPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const t = await getT()
  const { countryCode } = await props.params
  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  const products = await listWishlistProducts(countryCode)

  return (
    <div className="content-container py-12 small:py-20" data-testid="wishlist-page-wrapper">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-2">
        {t("wishlist.title")}
      </h1>
      <p className="text-base-regular text-ui-fg-subtle mb-10">
        {t("wishlist.count", { count: products.length })}
      </p>

      {products.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-y-4 text-center">
          <p className="text-ui-fg-muted text-base-regular">
            {t("wishlist.empty")}
          </p>
          <LocalizedClientLink
            href="/store"
            className="underline text-ui-fg-base hover:text-ui-fg-interactive"
          >
            {t("cart.browseProducts")}
          </LocalizedClientLink>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-4 gap-y-10 small:gap-y-12"
          data-testid="wishlist-products"
        >
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

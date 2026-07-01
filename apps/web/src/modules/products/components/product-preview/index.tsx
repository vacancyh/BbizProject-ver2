import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { isInWishlist } from "@lib/data/wishlist"
import WishlistButton from "@modules/wishlist/components/wishlist-button"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })

  const wished = await isInWishlist(product.id)

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper" className="relative">
        <WishlistButton productId={product.id} initialActive={wished} />
        <div className="overflow-hidden rounded-xl bg-ui-bg-subtle ring-1 ring-black/5 transition-shadow duration-300 group-hover:shadow-lg">
          <div className="transition-transform duration-500 ease-out group-hover:scale-[1.05]">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
            />
          </div>
        </div>
        <div className="flex flex-col gap-y-1 mt-3 px-0.5">
          <Text
            className="text-ui-fg-base text-sm line-clamp-1 group-hover:text-ui-fg-interactive transition-colors"
            data-testid="product-title"
          >
            {product.title}
          </Text>
          <div className="flex items-center gap-x-2 font-medium text-ui-fg-base">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}

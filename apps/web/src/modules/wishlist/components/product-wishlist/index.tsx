import { isInWishlist } from "@lib/data/wishlist"
import WishlistButton from "../wishlist-button"

// 상품 상세용: 서버에서 현재 찜 상태를 읽어 인라인 찜 버튼을 렌더
const ProductWishlist = async ({ productId }: { productId: string }) => {
  const active = await isInWishlist(productId)
  return (
    <WishlistButton productId={productId} initialActive={active} variant="inline" />
  )
}

export default ProductWishlist

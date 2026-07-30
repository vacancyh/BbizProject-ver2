import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listCategories = async (query?: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  // 라우트 파라미터가 URL 인코딩된 채로 들어오는 경우에 대비한 방어 코드.
  // 이미 디코드된 값이면 decodeURIComponent 가 그대로 돌려주므로 안전하다.
  //
  // 참고: 한글 handle(예: "상의") 카테고리 페이지는 404 였고, 이 디코딩만으로는 해결되지 않았다
  // (근본 원인 미확인). 실제 해법은 handle 을 ASCII 로 바꾼 것이다 — cleanup-test-data.ts 의
  // HANDLE_BY_NAME 및 기술부채_TODO_분류.md §3-1 참조. 비-ASCII handle 은 쓰지 말 것.
  const decode = (seg: string) => {
    try {
      return decodeURIComponent(seg)
    } catch {
      return seg
    }
  }
  const handle = `${categoryHandle.map(decode).join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}

import { getProductDisclosure } from "@lib/data/disclosure"

// 상품정보고시(전자상거래법) — 관리자 게시 항목을 키-값 표로 노출.
// 게시 고시가 없으면 렌더하지 않음(섹션 자체 숨김).
const ProductDisclosure = async ({ productId }: { productId: string }) => {
  const disclosure = await getProductDisclosure(productId)
  if (!disclosure || Object.keys(disclosure.fields).length === 0) {
    return null
  }

  const entries = Object.entries(disclosure.fields)

  return (
    <div className="w-full" data-testid="product-disclosure">
      <h2 className="text-xl-semi mb-4">상품정보 고시</h2>
      <div className="border border-ui-border-base rounded-rounded overflow-hidden">
        <dl className="divide-y divide-ui-border-base">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex flex-col small:flex-row small:items-start"
            >
              <dt className="small:w-1/3 bg-ui-bg-subtle px-4 py-3 text-small-regular text-ui-fg-subtle font-medium">
                {key}
              </dt>
              <dd className="small:w-2/3 px-4 py-3 text-small-regular text-ui-fg-base">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xsmall-regular text-ui-fg-muted mt-2">
        본 상품정보는 전자상거래법 「상품정보제공고시」에 따라 제공됩니다.
      </p>
    </div>
  )
}

export default ProductDisclosure

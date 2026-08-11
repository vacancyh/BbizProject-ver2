import { getProductDisclosure } from "@lib/data/disclosure"
import { getT, getUiLocale } from "@lib/i18n"
import { ko, type MessageKey } from "@lib/i18n/messages"

// 상품정보고시(전자상거래법) — 관리자 게시 항목을 키-값 표로 노출.
// 게시 고시가 없으면 렌더하지 않음(섹션 자체 숨김).
const ProductDisclosure = async ({ productId }: { productId: string }) => {
  const t = await getT()
  const locale = await getUiLocale()
  const disclosure = await getProductDisclosure(productId)
  /**
   * 항목명 고르기.
   *
   * **한국어에서는 백엔드 label 이 이긴다** — 상품유형 템플릿이 유형별로 더 정확한 표현을
   * 갖고 있다("제품 주소재"·"제품 소재(섬유 조성)"). 사전의 일반적인 "소재"로 덮으면
   * 운영자가 템플릿에 넣어 둔 정보가 사라진다.
   *
   * **다른 언어에서는 사전을 쓴다** — 템플릿 label 은 한국어 원문뿐이라 그대로 두면
   * 영어 화면에 한국어 항목명이 남는다. 사전에 없는 key 는 label 로 떨어진다.
   *
   * ⚠️ **값**은 어느 언어에서도 번역하지 않는다 — 전자상거래법 고시의 기준은 한국어 원문이다.
   */
  const labelFor = (key: string, backendLabel: string): string => {
    if (locale === "ko") return backendLabel
    const k = `disclosure.field.${key}` as MessageKey
    return k in ko ? t(k) : backendLabel
  }

  // 백엔드가 items 를 주면 그걸 쓴다(정렬이 템플릿 기준으로 맞춰져 있다).
  // 구버전 응답 대비로 fields 폴백을 남긴다.
  const entries: (readonly [string, string])[] = disclosure?.items?.length
    ? disclosure.items.map((i) => [labelFor(i.key, i.label), i.value] as const)
    : Object.entries(disclosure?.fields ?? {})

  if (!disclosure || entries.length === 0) {
    return null
  }

  return (
    <div className="w-full" data-testid="product-disclosure">
      <h2 className="text-xl-semi mb-4">{t("disclosure.title")}</h2>
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
        {t("disclosure.legalNote")}
      </p>
    </div>
  )
}

export default ProductDisclosure

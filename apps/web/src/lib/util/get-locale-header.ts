import { getUiLocale } from "@lib/i18n"
import { CONTENT_LOCALE } from "@lib/i18n/routing"

/**
 * 백엔드에 보낼 콘텐츠 언어 헤더.
 *
 * 예전에는 쿠키만 봤다. 이제 **주소가 언어를 정하므로**(`/en/kr/...`) 화면 언어와
 * 같은 출처를 써야 한다 — 안 그러면 버튼은 영어인데 상품명만 한국어로 나온다.
 * `getUiLocale()` 이 헤더(주소) → 쿠키 순으로 판단한다.
 */
export async function getLocaleHeader() {
  const locale = await getUiLocale()
  return {
    "x-medusa-locale": CONTENT_LOCALE[locale],
  } as const
}

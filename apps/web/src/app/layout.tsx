import { getBaseURL } from "@lib/util/env"
import { getUiLocale } from "@lib/i18n"
import { I18nProvider } from "@lib/i18n/client"
import { PATHNAME_HEADER, localeAlternates } from "@lib/i18n/routing"
import { UI_LOCALES, type UiLocale } from "@lib/i18n/messages"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"

/** UI 언어 → hreflang 값. 지역까지 밝혀 주는 편이 검색엔진에 정확하다. */
const HREFLANG: Record<UiLocale, string> = {
  ko: "ko-KR",
  en: "en",
}

/**
 * 언어별 주소를 검색엔진에 알린다(hreflang) + canonical 지정.
 *
 * ── 왜 필요한가 (2026-08-12) ────────────────────────────────────────────────
 * 언어를 주소에 담았으니(`/kr` vs `/en/kr`) 이제 두 주소가 **같은 내용의 다른 언어판**
 * 이라는 걸 알려 줘야 한다. 안 알리면 검색엔진이 중복 문서로 보거나, 한국 사용자에게
 * 영어판을 노출하는 식으로 엉뚱하게 고른다.
 *
 * 지금 보고 있는 주소는 미들웨어가 `x-pathname` 으로 넘겨 준다 —
 * rewrite 후에는 원래 주소를 알 수 없기 때문이다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = getBaseURL()
  let pathname = "/"
  try {
    pathname = (await headers()).get(PATHNAME_HEADER) || "/"
  } catch {
    // 요청 컨텍스트 밖 — 기본값으로 둔다
  }

  const alts = localeAlternates(pathname)
  const languages: Record<string, string> = {}
  for (const l of Object.keys(UI_LOCALES) as UiLocale[]) {
    languages[HREFLANG[l]] = `${base}${alts[l]}`
  }
  // 언어를 못 정한 방문자용 기본판 — 이 쇼핑몰의 기준은 한국어다
  languages["x-default"] = `${base}${alts.ko}`

  return {
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}${pathname}`,
      languages,
    },
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  // 언어는 **주소**가 정한다(`/en/kr/...`). 미들웨어가 헤더로 넘겨 주고,
  // 접두사가 없으면 쿠키 → 기본(한국어) 순으로 떨어진다(2026-08-12).
  // 상품명 같은 콘텐츠 번역도 같은 판단을 쓰므로 화면 문구와 항상 같이 움직인다.
  const locale = await getUiLocale()

  return (
    // lang 을 실제 언어로 — 스크린리더 발음과 검색엔진이 이걸 본다
    <html lang={locale} data-mode="light">
      <body>
        <I18nProvider locale={locale}>
          <main className="relative">{props.children}</main>
        </I18nProvider>
      </body>
    </html>
  )
}

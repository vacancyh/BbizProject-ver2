import { getBaseURL } from "@lib/util/env"
import { getUiLocale } from "@lib/i18n"
import { I18nProvider } from "@lib/i18n/client"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  // 언어는 `_medusa_locale` 쿠키 하나로 정해진다 —
  // 상품명 같은 콘텐츠 번역과 화면 문구가 같이 바뀌도록 같은 스위치를 쓴다(2026-08-05).
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

"use client"

import { useEffect } from "react"
import { reportError } from "@lib/util/monitoring"
import { DEFAULT_UI_LOCALE, makeT, toUiLocale } from "@lib/i18n/messages"

/**
 * 전역 에러 바운더리 — 렌더 중 처리되지 않은 예외를 잡아 모니터링으로 보고 + 안내 화면.
 * (Next.js App Router: root layout 을 감싸는 최상위 에러 경계)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "global-error" })
  }, [error])

  // ⚠️ 이 화면은 root layout 을 **대체**하므로 I18nProvider 가 없다 → useT() 를 못 쓴다.
  //    언어 쿠키를 직접 읽어 사전을 고른다. 못 읽으면 기본(한국어).
  const locale =
    typeof document !== "undefined"
      ? toUiLocale(
          document.cookie.match(/(?:^|;\s*)_medusa_locale=([^;]+)/)?.[1]
        )
      : DEFAULT_UI_LOCALE
  const t = makeT(locale)

  return (
    <html lang={locale}>
      <body>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            fontFamily: "sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>
            {t("error.globalTitle")}
          </h1>
          <p style={{ color: "#666", fontSize: 14 }}>
            {t("error.globalBody")}
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: 44,
              padding: "0 20px",
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      </body>
    </html>
  )
}

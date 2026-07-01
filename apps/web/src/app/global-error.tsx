"use client"

import { useEffect } from "react"
import { reportError } from "@lib/util/monitoring"

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

  return (
    <html lang="ko">
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
            일시적인 오류가 발생했습니다
          </h1>
          <p style={{ color: "#666", fontSize: 14 }}>
            잠시 후 다시 시도해 주세요. 문제가 계속되면 고객센터로 문의해 주세요.
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
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}

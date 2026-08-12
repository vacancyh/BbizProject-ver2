"use client"

/**
 * 쇼핑 화면 오류 경계 (2026-08-12 신설)
 *
 * ── 왜 필요했나 ─────────────────────────────────────────────────────────────
 * 오류 경계가 `app/global-error.tsx` 하나뿐이었다. 그건 **root layout 을 통째로
 * 대체**하므로, 백엔드가 잠깐 흔들리면 고객은 헤더·푸터도 없는 화면을 봤다 —
 * 돌아갈 링크조차 없다. 서버 렌더 중 예외면 아예 HTTP 500 빈 화면이 나갔다
 * (2026-08-12 실제로 목격: 백엔드 재기동 중 `/kr` 이 500).
 *
 * 이 파일은 **(main) 세그먼트 안에서만** 오류를 잡으므로 헤더·푸터는 그대로 남고,
 * 고객은 다시 시도하거나 다른 곳으로 이동할 수 있다.
 *
 * ── 주의 ────────────────────────────────────────────────────────────────────
 * 오류 화면은 클라이언트 컴포넌트여야 한다(Next 규칙). 그래서 서버 전용
 * `@lib/i18n` 이 아니라 `@lib/i18n/client` 를 쓴다 — 반대로 하면 화면이 500 이 된다.
 */
import { useEffect } from "react"

import { useT } from "@lib/i18n/client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { reportError } from "@lib/util/monitoring"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  useEffect(() => {
    // 고객에게는 원인을 보여주지 않지만, 우리는 알아야 한다
    reportError(error, { digest: error.digest, scope: "main-segment" })
  }, [error])

  return (
    <div
      className="content-container flex flex-col items-center justify-center gap-6 py-32 text-center"
      data-testid="segment-error"
    >
      <h1 className="text-2xl-semi text-ui-fg-base">{t("error.globalTitle")}</h1>
      <p className="text-base-regular text-ui-fg-subtle max-w-md">
        {t("error.globalBody")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="h-11 rounded-rounded border border-ui-border-interactive px-6 text-base-regular hover:bg-ui-bg-subtle"
          data-testid="error-retry"
        >
          {t("common.retry")}
        </button>
        <LocalizedClientLink
          href="/"
          className="h-11 rounded-rounded border border-ui-border-base px-6 leading-[2.75rem] text-base-regular hover:bg-ui-bg-subtle"
        >
          {t("error.goHome")}
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/customer-service"
          className="h-11 rounded-rounded px-6 leading-[2.75rem] text-base-regular text-ui-fg-interactive hover:underline"
        >
          {t("nav.customerService")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

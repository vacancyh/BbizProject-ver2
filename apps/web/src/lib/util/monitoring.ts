/**
 * 에러 모니터링 통합점 (스캐폴딩)
 * ─────────────────────────────────────────────────────────
 * 운영 중 런타임 에러를 한 곳에서 수집하기 위한 단일 seam.
 * 현재는 구조화 콘솔 로그. 운영 전환 시 Sentry 등으로 이 함수만 교체하면 전 구간 적용.
 *
 * ▶ Sentry 활성화(운영):
 *   1) `pnpm add @sentry/nextjs` 후 `npx @sentry/wizard@latest -i nextjs`
 *   2) 환경변수 `NEXT_PUBLIC_SENTRY_DSN` 설정
 *   3) 아래 reportError 내부의 Sentry 호출 주석 해제 + import 추가
 *   (자세한 절차: docs/실서비스_연동_백로그.md §13)
 */
export type ErrorContext = Record<string, unknown>

export function reportError(error: unknown, context?: ErrorContext): void {
  // 운영(Sentry 설치 후):
  // import * as Sentry from "@sentry/nextjs"
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) { Sentry.captureException(error, { extra: context }); return }

  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    ts: new Date().toISOString(),
  }
  // 구조화 로그(수집 파이프라인에서 파싱 가능)
  console.error("[monitoring]", JSON.stringify(payload))
}

/**
 * 스토어프론트 ISR 캐시 무효화 구독자
 *
 * 카테고리·상품·컬렉션 변경 이벤트 발생 시 스토어프론트 Next.js 앱의
 * on-demand revalidation 엔드포인트(POST /api/revalidate)를 호출해
 * ISR 캐시를 무효화한다.
 *
 * 설계 원칙:
 *  - Medusa 코어 미수정 — 이벤트 구독만.
 *  - revalidate 호출 실패 시 로깅만 하고 흡수 — 비즈니스 흐름 차단 금지.
 *  - 호출 계약(이벤트명/URL/시크릿/payload)은 revalidate-contract.ts 단일 출처를
 *    참조한다(§V0 재발방지: 분산 정의로 인한 단절 방지).
 *
 * 환경변수(revalidate-contract.ts ENV 참조):
 *      STOREFRONT_URL      스토어프론트 baseURL (예: http://localhost:8000)
 *      REVALIDATE_SECRET   webhook 인증 토큰 (미설정 시 토큰 없이 호출)
 *  → 미설정 시 resolveRevalidateTarget().enabled=false 로 안전하게 건너뜀.
 *
 * 지원 이벤트 / 구독 등록:
 *  - SUBSCRIBED_EVENTS(= EVENT_TYPE_MAP 의 key) 를 config.event 로 사용.
 *  - 단일 default export 핸들러에서 event.name 으로 분기.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  EVENT_TYPE_MAP,
  SUBSCRIBED_EVENTS,
  resolveRevalidateTarget,
  type RevalidatePayload,
} from "./revalidate-contract"

/**
 * 스토어프론트 revalidate 호출 헬퍼
 * @param payload  타입 + 핸들 정보
 * @param logger   Medusa logger 인스턴스
 */
async function callRevalidate(
  payload: RevalidatePayload,
  logger: { error?: (msg: string) => void; info?: (msg: string) => void }
) {
  const target = resolveRevalidateTarget()
  if (!target.enabled || !target.url) {
    logger.info?.("[storefront-revalidate] STOREFRONT_URL 미설정 — revalidate 건너뜀")
    return
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (target.secret) {
    headers["Authorization"] = `Bearer ${target.secret}`
  }

  const res = await fetch(target.url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    // 5초 타임아웃 (AbortSignal — Node 18+)
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    logger.error?.(
      `[storefront-revalidate] revalidate 실패 (${res.status}): ${text.slice(0, 200)}`
    )
  } else {
    logger.info?.(`[storefront-revalidate] ISR purge 완료 — type=${payload.type} handle=${payload.handle ?? "-"}`)
  }
}

/**
 * 통합 핸들러 — 모든 이벤트를 단일 default export 로 처리.
 * event.name 으로 분기해 EVENT_TYPE_MAP 에 따라 revalidate 호출.
 */
export default async function storefrontRevalidateHandler({
  event: { data, name: eventName },
  container,
}: SubscriberArgs<{ id: string; handle?: string }>) {
  const logger = (() => {
    try {
      return container.resolve("logger") as { error?: (m: string) => void; info?: (m: string) => void }
    } catch {
      return console as unknown as { error?: (m: string) => void; info?: (m: string) => void }
    }
  })()

  const type = EVENT_TYPE_MAP[eventName]
  if (!type) return

  try {
    await callRevalidate({ type, handle: data?.handle }, logger)
  } catch (e: any) {
    // revalidate 실패가 비즈니스 흐름을 막지 않도록 흡수
    logger.error?.(
      `[storefront-revalidate] revalidate 호출 예외 (event=${eventName}): ${e?.message ?? e}`
    )
  }
}

export const config: SubscriberConfig = {
  // 구독 이벤트는 계약(EVENT_TYPE_MAP)에서 도출 — 중복 정의 방지.
  event: SUBSCRIBED_EVENTS,
}

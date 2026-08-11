/**
 * 스토어프론트 revalidate 호출 계약 — 백엔드 측 단일 출처(Single Source of Truth)
 *
 * §V0 재발방지: 이벤트명 → revalidate type 매핑, 호출 URL/시크릿 환경변수,
 * 요청 payload 형태를 한 곳에서만 정의한다. subscriber 가 본 파일을 참조하므로,
 * "어떤 이벤트가 어떤 type 으로, 어떤 엔드포인트로" 호출되는지가 분산되어
 * 어긋나는 단절이 재발하지 않는다.
 *
 * 스토어프론트 측 대응 계약: apps/web/src/lib/data/revalidate-tags.ts
 *  - 본 파일의 RevalidateType ↔ 그 파일의 RevalidateType 은 동일 문자열 유니온이어야 한다.
 */

/** revalidate 요청 type — 스토어프론트 revalidate-tags.ts 의 RevalidateType 과 1:1 정합 */
export type RevalidateType = "category" | "product" | "collection" | "tag" | "all"

/** revalidate webhook payload */
export type RevalidatePayload = {
  type: RevalidateType
  handle?: string
  /** 단건 리터럴 경로용 국가코드(미지정 시 스토어프론트 기본값 kr 사용) */
  countryCode?: string
}

/**
 * Medusa 이벤트명 → revalidate type 매핑.
 * config.event 배열과 본 맵의 key 집합은 동일해야 한다(SUBSCRIBED_EVENTS 로 도출).
 */
export const EVENT_TYPE_MAP: Record<string, RevalidateType> = {
  "product-category.created": "category",
  "product-category.updated": "category",
  "product-category.deleted": "category",
  "product.created": "product",
  "product.updated": "product",
  "product.deleted": "product",
  "product-collection.created": "collection",
  "product-collection.updated": "collection",
  "product-collection.deleted": "collection",
}

/** 구독 대상 이벤트 목록 — config.event 에 그대로 사용(맵에서 도출, 중복 정의 방지) */
export const SUBSCRIBED_EVENTS = Object.keys(EVENT_TYPE_MAP)

/** 환경변수 이름 — .env.example / .env.template 와 동일 키 */
export const ENV = {
  /** 스토어프론트 baseURL (예: http://localhost:8000) — 미설정 시 revalidate 건너뜀 */
  storefrontUrl: "STOREFRONT_URL",
  /** webhook 인증 토큰 — 스토어프론트 REVALIDATE_SECRET 과 동일 값이어야 함 */
  revalidateSecret: "REVALIDATE_SECRET",
} as const

/** revalidate 엔드포인트 경로(스토어프론트 app/api/revalidate/route.ts 와 정합) */
export const REVALIDATE_PATH = "/api/revalidate"

/**
 * 환경에서 호출 대상 정보를 읽어 반환.
 * storefrontUrl 미설정 시 enabled=false → subscriber 가 안전하게 건너뛴다.
 */
export function resolveRevalidateTarget(
  env: NodeJS.ProcessEnv = process.env
): { enabled: boolean; url?: string; secret?: string } {
  const base = env[ENV.storefrontUrl]
  if (!base) return { enabled: false }
  const url = `${base.replace(/\/$/, "")}${REVALIDATE_PATH}`
  return { enabled: true, url, secret: env[ENV.revalidateSecret] }
}

/**
 * 스토어프론트 revalidate 호출 — 구독자와 관리자 라우트가 함께 쓴다.
 *
 * 이벤트가 없는 변경(예: **번역 저장**)도 캐시를 지워야 하는데, 번역 모듈은
 * 이벤트를 발행하지 않는다. 그래서 저장 라우트가 이 함수를 직접 부른다.
 * 실패해도 예외를 던지지 않는다 — 캐시 무효화 실패가 저장을 막으면 안 된다.
 */
export async function callRevalidate(
  payload: RevalidatePayload,
  logger?: { error?: (m: string) => void; info?: (m: string) => void }
): Promise<{ ok: boolean; reason?: string }> {
  const target = resolveRevalidateTarget()
  if (!target.enabled || !target.url) {
    logger?.info?.("[revalidate] STOREFRONT_URL 미설정 — 건너뜀")
    return { ok: false, reason: "disabled" }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (target.secret) headers["Authorization"] = `Bearer ${target.secret}`

  try {
    const res = await fetch(target.url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      logger?.error?.(`[revalidate] 실패 (${res.status}): ${text.slice(0, 200)}`)
      return { ok: false, reason: `http_${res.status}` }
    }
    logger?.info?.(
      `[revalidate] 완료 — type=${payload.type} handle=${payload.handle ?? "-"}`
    )
    return { ok: true }
  } catch (e: any) {
    // 원인을 함께 돌려준다 — "exception" 만 보면 네트워크인지 설정인지 알 수 없다.
    const msg = String(e?.message ?? e)
    logger?.error?.(`[revalidate] 호출 예외: ${msg}`)
    return { ok: false, reason: `exception: ${msg}` }
  }
}

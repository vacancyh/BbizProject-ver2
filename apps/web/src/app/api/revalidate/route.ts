/**
 * 스토어프론트 ISR 캐시 무효화 Webhook Route
 *
 * 경로: POST /api/revalidate
 *
 * 호출 주체: Medusa 백엔드 (카테고리·상품 변경 후 이벤트 훅에서 호출)
 *
 * 인증:
 *  - Bearer 토큰 방식: Authorization: Bearer <REVALIDATE_SECRET>
 *  - 환경변수: REVALIDATE_SECRET (미설정 시 비인증 경고만 로그)
 *
 * Body (JSON):
 *  {
 *    type: "category" | "product" | "collection" | "tag" | "all",
 *    handle?: string,    // 단건 purge 시 — 예: "tops"
 *    tags?: string[],    // Next.js cache tag 직접 지정 시
 *  }
 *
 * 동작:
 *  - handle 있으면 해당 경로(revalidatePath) + 타입별 태그(revalidateTag) purge
 *  - handle 없으면 type 에 해당하는 태그 전체 purge
 *  - type = "all" 이면 모든 카탈로그 태그 purge
 *
 * Next.js 15 App Router on-demand revalidation 공식 패턴 사용.
 * (참고: https://nextjs.org/docs/app/building-your-application/caching#on-demand-revalidation)
 */
import { timingSafeEqual } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import {
  TYPE_TAG_MAP,
  pathsForRevalidate,
  type RevalidateType,
} from "@lib/data/revalidate-tags"

// 보안점검 2026-07-27: 커스텀 태그 무단 무효화(캐시 DoS) 방지용 허용 태그 집합.
const ALLOWED_TAGS = new Set(Object.values(TYPE_TAG_MAP).flat() as string[])

/**
 * 태그/경로 매핑은 단일 출처(revalidate-tags.ts)에서 가져온다.
 * §V0 재발방지: getCacheOptions(cookies.ts) 가 부착하는 안정 태그와 동일한
 * base 태그를 무효화하므로, 태그 스킴 불일치로 revalidate 가 무효화되는
 * 단절이 재발하지 않는다.
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 인증 검사 ──────────────────────────────────────────
  const secret = process.env.REVALIDATE_SECRET
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    // 상수시간 비교(타이밍 사이드채널 방지). 길이 불일치는 즉시 실패.
    const a = new Uint8Array(Buffer.from(token))
    const b = new Uint8Array(Buffer.from(secret))
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    // 보안점검 2026-07-27: 운영에서 시크릿 미설정이면 비인증 무효화를 막기 위해 fail-closed.
    console.error("[revalidate] REVALIDATE_SECRET 미설정 — 운영에서 요청 거부(503).")
    return NextResponse.json({ error: "revalidate secret not configured" }, { status: 503 })
  } else {
    console.warn("[revalidate] REVALIDATE_SECRET 미설정 — 개발 전용 허용. 운영은 필수.")
  }

  // ── 요청 파싱 ─────────────────────────────────────────
  let body: { type?: string; handle?: string; tags?: string[]; countryCode?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 })
  }

  const { type = "all", handle, tags: customTags, countryCode } = body

  const isKnownType = (t: string): t is RevalidateType => t in TYPE_TAG_MAP

  if (!isKnownType(type) && !customTags?.length) {
    return NextResponse.json(
      { error: `알 수 없는 type: '${type}'. category|product|collection|tag|all 중 하나를 사용하세요.` },
      { status: 400 }
    )
  }

  const purgedTags: string[] = []
  const purgedPaths: string[] = []

  // ── 커스텀 태그 직접 무효화 (허용 태그만 — 캐시 무효화 DoS 방지) ──
  if (customTags?.length) {
    const invalid = customTags.filter((t) => !ALLOWED_TAGS.has(t))
    if (invalid.length) {
      return NextResponse.json(
        { error: `허용되지 않은 tag: ${invalid.join(", ")}` },
        { status: 400 }
      )
    }
    for (const tag of customTags) {
      revalidateTag(tag)
      purgedTags.push(tag)
    }
  }

  // ── 타입별 안정 태그 무효화 (getCacheOptions 안정 태그와 정합) ──
  const typeTags = isKnownType(type) ? TYPE_TAG_MAP[type] : []
  for (const tag of typeTags) {
    revalidateTag(tag)
    purgedTags.push(tag)
  }

  // ── 경로 무효화 (단일 출처 pathsForRevalidate, 라우트 그룹 제외) ──
  if (isKnownType(type)) {
    const paths = pathsForRevalidate(type, handle, countryCode)
    for (const p of paths) {
      // 동적 세그먼트 패턴([..]) 은 "page", 그 외 리터럴/루트는 기본 처리.
      if (type === "all") {
        revalidatePath(p, "layout")
      } else {
        revalidatePath(p, "page")
      }
      purgedPaths.push(p)
    }
  }

  console.info(`[revalidate] type=${type} handle=${handle ?? "-"} tags=${purgedTags.join(",")} paths=${purgedPaths.join(",")}`)

  return NextResponse.json({
    ok: true,
    revalidated: { tags: purgedTags, paths: purgedPaths },
    timestamp: new Date().toISOString(),
  })
}

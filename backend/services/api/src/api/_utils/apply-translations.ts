/**
 * 커스텀 모듈 응답에 번역 적용 (2026-08-05 신설)
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * Medusa 번역 모듈은 **코어 엔티티**(상품·카테고리·컬렉션 …)에만 번역을 자동 적용한다.
 * 이 프로젝트가 따로 만든 모듈(공지·FAQ·배너·약관·상품고시)은 코어가 모르기 때문에,
 * 번역을 저장해도 고객 화면에는 계속 원문이 나간다.
 *
 * 실측(2026-08-05): `notice` 에 영어 번역을 넣고 `x-medusa-locale: en-US` 로 조회해도
 * 한국어 원문이 그대로 돌아왔다. → 커스텀 라우트에서 직접 적용해야 한다.
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────────────────
 *   const notices = await svc.listNotices(...)
 *   res.json({ notices: await applyTranslations(req, "notice", notices) })
 *
 * ── 설계 원칙 ──────────────────────────────────────────────────────────────
 * · **조회 실패가 화면을 깨뜨리지 않는다.** 번역 모듈이 꺼져 있거나 조회가 실패하면
 *   원문을 그대로 돌려준다(번역이 없는 것과 같은 상태). 공지 목록이 500 이 나는 것보다
 *   한국어로 보이는 편이 낫다.
 * · **빈 값은 무시한다.** 번역 필드가 빈 문자열이면 원문을 유지한다.
 *   안 그러면 "제목이 사라진 공지"가 화면에 뜬다.
 */
import type { MedusaRequest } from "@medusajs/framework/http"

/** 이 프로젝트에서 번역 대상인 커스텀 엔티티와 필드. 관리자 화면·시드와 같은 목록을 쓴다. */
export const CUSTOM_TRANSLATABLE: Record<string, string[]> = {
  notice: ["title", "body"],
  faq: ["question", "answer", "category"],
  banner: ["title"],
  legal_doc: ["body"],
  // 상품고시(product_disclosure)는 빠져 있다 — 값이 개별 컬럼이 아니라
  // `fields_json` 이라는 JSON 블롭이라 필드 단위 치환이 안 된다.
  // 번역하려면 JSON 안의 항목별 번역 구조를 따로 설계해야 한다(미구현).
}

/** 요청 헤더에서 로케일을 읽는다. 없으면 null(=기본 언어). */
export function localeOf(req: MedusaRequest): string | null {
  const raw = req.headers["x-medusa-locale"]
  const v = Array.isArray(raw) ? raw[0] : raw
  const s = (v ?? "").toString().trim()
  // 버킷 키가 아니라 DB 조회 값이지만, 비정상적으로 긴 입력은 받지 않는다
  return s && s.length <= 32 ? s : null
}

/**
 * rows 의 번역 가능한 필드를 요청 로케일 값으로 바꿔서 돌려준다.
 * 로케일이 없거나 번역이 없으면 rows 를 그대로 돌려준다(복사 없음).
 */
export async function applyTranslations<T extends { id: string }>(
  req: MedusaRequest,
  reference: string,
  rows: T[]
): Promise<T[]> {
  const locale = localeOf(req)
  if (!locale || !rows?.length) return rows

  const fields = CUSTOM_TRANSLATABLE[reference]
  if (!fields?.length) return rows

  let translations: any[] = []
  try {
    const svc = req.scope.resolve("translation") as any
    translations = await svc.listTranslations({
      reference,
      reference_id: rows.map((r) => r.id),
      locale_code: locale,
    })
  } catch {
    // 번역 모듈 미등록/피처 플래그 OFF/조회 실패 → 원문 그대로
    return rows
  }
  if (!translations.length) return rows

  const byId = new Map<string, Record<string, unknown>>(
    translations.map((t) => [t.reference_id, (t.translations ?? {}) as Record<string, unknown>])
  )

  return rows.map((row) => {
    const tr = byId.get(row.id)
    if (!tr) return row
    const patch: Record<string, unknown> = {}
    for (const f of fields) {
      const v = tr[f]
      // 빈 번역으로 원문을 지우지 않는다 — 제목 없는 공지가 뜨는 것을 막는다
      if (typeof v === "string" && v.trim()) patch[f] = v
    }
    return Object.keys(patch).length ? { ...row, ...patch } : row
  })
}

/** 단건용 편의 함수. */
export async function applyTranslationOne<T extends { id: string }>(
  req: MedusaRequest,
  reference: string,
  row: T | null | undefined
): Promise<T | null | undefined> {
  if (!row) return row
  const [out] = await applyTranslations(req, reference, [row])
  return out
}

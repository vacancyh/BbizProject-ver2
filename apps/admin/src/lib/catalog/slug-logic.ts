/**
 * slug(handle) 검증 순수 로직 모듈 (d4 t006_slug검증캐시 spec §9 — UT-001 형식/중복)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/categories/page.tsx 의 카테고리/컬렉션 생성·수정 핸들러가
 *   validateSlug 로 형식 위반/중복을 "저장 전" 차단(422 상당) 후 코어 create/update 호출.
 *
 * 코어 직접호출 원칙(§V0-5): 신규 백엔드 route 없음. 형식 검증은 클라이언트 순수함수,
 * 중복 검증은 코어 목록 조회 결과(기존 handle 목록)에 대해 isDuplicateSlug 로 판정.
 *
 * §V0 재발방지: slug 형식/중복 판정의 단일 진실 함수 → 카테고리·컬렉션·태그 어느 저장 경로든
 * 동일 가드 경유(각 화면이 제각각 빈값만 체크하던 분산 검증 제거).
 */

/** slug 허용 패턴 — 소문자 영숫자, 단일 하이픈 구분(선/후행·중복 하이픈 불가). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 128;

/** 제목 → slug 정규화 (한글 등 비-영숫자 제거, 비면 timestamp 폴백). products.slugify 정합. */
export function normalizeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `slug-${Date.now().toString(36)}`;
}

/** 형식 검증 — 패턴 일치 여부. */
export function validateSlugFormat(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/** 길이 검증. */
export function validateSlugLength(
  slug: string,
  min = SLUG_MIN_LENGTH,
  max = SLUG_MAX_LENGTH
): boolean {
  return slug.length >= min && slug.length <= max;
}

/** slug 검증 결과 */
export type SlugValidation = { valid: boolean; errors: string[] };

/**
 * slug 종합 검증 (UT-001 형식 위반 차단)
 * - 공백/빈값, 길이, 형식(대문자·공백·특수문자·하이픈 규칙) 검사.
 */
export function validateSlug(slug: string): SlugValidation {
  const errors: string[] = [];
  const s = (slug ?? "").trim();

  if (!s) {
    errors.push("slug가 비어 있습니다");
    return { valid: false, errors };
  }
  if (!validateSlugLength(s)) {
    errors.push(`slug 길이는 ${SLUG_MIN_LENGTH}~${SLUG_MAX_LENGTH}자여야 합니다`);
  }
  if (!validateSlugFormat(s)) {
    errors.push("slug 형식 위반(소문자 영숫자와 하이픈만, 선/후행·연속 하이픈 불가)");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 중복 판정 (UT-001 중복 차단) — 대소문자 무시 비교.
 * @param candidate 검사할 slug
 * @param existing  기존 handle 목록(코어 목록 조회 결과)
 * @param selfId/selfHandle 자기 자신(수정 시)은 중복에서 제외하기 위한 현재 handle
 */
export function isDuplicateSlug(
  candidate: string,
  existing: string[],
  selfHandle?: string
): boolean {
  const c = candidate.trim().toLowerCase();
  const self = selfHandle?.trim().toLowerCase();
  return existing.some((h) => {
    const e = h.trim().toLowerCase();
    if (self && e === self) return false; // 자기 자신 제외
    return e === c;
  });
}

/**
 * 저장 전 최종 검증 (형식 + 중복 통합) — 핸들러가 호출하는 단일 진입점.
 * 형식/중복 어느 하나라도 위반이면 valid=false + 사유.
 */
export function validateSlugForSave(
  slug: string,
  existing: string[],
  selfHandle?: string
): SlugValidation {
  const base = validateSlug(slug);
  const errors = [...base.errors];
  if (base.valid && isDuplicateSlug(slug, existing, selfHandle)) {
    errors.push("이미 사용 중인 slug입니다");
  }
  return { valid: errors.length === 0, errors };
}

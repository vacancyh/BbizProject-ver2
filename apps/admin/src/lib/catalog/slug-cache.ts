/**
 * slug 해석 캐시 + 무효화 순수 로직 모듈 (d4 t006_slug검증캐시 spec §9 — UT-002 캐시 무효화)
 *
 * - DOM/fetch/React 없는 순수 자료구조 → vitest 단위 테스트 가능.
 * - 목적: 어드민 클라이언트가 slug→엔티티를 캐싱할 때, slug 변경 시 옛 slug 캐시가
 *   stale 로 남아 잘못된 해석을 하지 않도록 "변경 시 무효화(purge)" 를 단일 함수로 보장.
 *
 * 주: 본 모듈은 클라이언트 측 캐시 무효화 책임만 진다. 백엔드/CDN(ISR) 캐시 purge 는
 *     별도 인프라(갭B) 영역으로 본 도메인 deferred 에 명시.
 *
 * §V0 재발방지: slug 변경 경로(카테고리/컬렉션 handle 수정)가 항상 invalidateOnChange 를
 *   경유하도록 단일 API 제공 → 화면별 ad-hoc 캐시 갱신 누락(옛 slug 잔존) 방지.
 */

/** 제네릭 slug 캐시 인스턴스 인터페이스 */
export type SlugCache<T> = {
  /** slug 로 캐시 조회(없으면 undefined) */
  get(slug: string): T | undefined;
  /** slug 캐시 저장 */
  set(slug: string, value: T): void;
  /** slug 존재 여부 */
  has(slug: string): boolean;
  /** 단일 slug 무효화 */
  invalidate(slug: string): boolean;
  /** 전체 무효화 */
  invalidateAll(): void;
  /**
   * slug 변경 시 무효화 — 옛 slug 캐시를 제거하고, 새 값이 있으면 새 slug 로 재적재.
   * 변경 후 옛 slug 로 조회하면 반드시 miss(undefined) 가 되도록 보장(UT-002).
   * @returns 새 slug
   */
  invalidateOnChange(oldSlug: string, newSlug: string, value?: T): string;
  /** 현재 캐시 크기 */
  readonly size: number;
};

/** slug 캐시 생성 (대소문자 무시 키 정규화) */
export function createSlugCache<T>(): SlugCache<T> {
  const store = new Map<string, T>();
  const norm = (s: string) => s.trim().toLowerCase();

  return {
    get(slug) {
      return store.get(norm(slug));
    },
    set(slug, value) {
      store.set(norm(slug), value);
    },
    has(slug) {
      return store.has(norm(slug));
    },
    invalidate(slug) {
      return store.delete(norm(slug));
    },
    invalidateAll() {
      store.clear();
    },
    invalidateOnChange(oldSlug, newSlug, value) {
      const o = norm(oldSlug);
      const n = norm(newSlug);
      // 옛 slug 의 기존 값(재적재용) 확보 후 제거
      const prev = value !== undefined ? value : store.get(o);
      if (o !== n) {
        store.delete(o);
      } else {
        // slug 가 동일해도 값 갱신을 위해 일단 제거
        store.delete(o);
      }
      if (prev !== undefined) {
        store.set(n, prev);
      }
      return newSlug;
    },
    get size() {
      return store.size;
    },
  };
}

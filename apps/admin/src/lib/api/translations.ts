/**
 * 다국어 콘텐츠 번역 API 호출 레이어 (2026-08-05 신설)
 *
 * ── 무엇을 다루나 ──────────────────────────────────────────────────────────
 * **운영자가 직접 입력하는 콘텐츠**의 번역만 다룬다.
 *   상품명·설명 · 옵션명 · 카테고리명 · 컬렉션명 · 배송방법명 …
 *
 * 화면의 버튼·안내문 같은 **UI 라벨은 여기 대상이 아니다.** 그건 코드에서 관리한다
 * (운영자가 바꿀 일이 없고, 바꾸면 화면이 깨진다).
 *
 * ── 저장 구조 ──────────────────────────────────────────────────────────────
 * 번역은 원본 레코드를 건드리지 않고 별도 테이블에 쌓인다.
 *   reference      "product" 같은 엔티티 이름
 *   reference_id   그 레코드의 id
 *   locale_code    "en-US"
 *   translations   { title: "...", description: "..." }  필드명 → 번역값
 *
 * 즉 **기본 언어(한국어)는 원본 필드 그대로**이고, 번역은 추가 언어에만 만든다.
 *
 * ── 전제 ───────────────────────────────────────────────────────────────────
 * 백엔드에 `@medusajs/translation` 모듈 등록 + `featureFlags.translation = true`.
 * 플래그가 꺼져 있으면 아래 엔드포인트가 전부 **404** 다(모듈만 켜서는 안 된다).
 */
import { apiFetch } from "./client";

/** 지원 언어 한 건. code 는 BCP 47(예: ko-KR, en-US). */
export type Locale = { code: string; name: string };

/** 저장된 번역 한 건. */
export type Translation = {
  id: string;
  reference: string;
  reference_id: string;
  locale_code: string;
  translations: Record<string, string>;
};

/**
 * 어떤 엔티티의 어떤 필드가 번역 대상인지.
 *
 * 백엔드는 배열이 아니라 **엔티티명을 키로 하는 객체**로 준다:
 *   { product: { id, fields, inactive_fields, is_active }, product_category: {...} }
 * 화면에서 쓰기 편하도록 아래 함수가 배열로 펴서 돌려준다.
 */
export type TranslationSetting = {
  id: string;
  entity_type: string;
  fields: string[];
  is_active: boolean;
};

/**
 * 스토어가 지원하는 언어 목록.
 *
 * 주의: `/admin/locales` 는 **선택 가능한 전체 언어 51개**를 돌려준다.
 * 화면에 띄울 언어 탭은 그게 아니라 **스토어에 지정된 지원 언어**여야 하므로
 * store 에서 읽는다. (지정은 `setup-translation.ts` 로 한다)
 */
export async function listSupportedLocales(): Promise<Locale[]> {
  const res = await apiFetch<{
    stores: { supported_locales?: { locale_code: string; locale?: { name?: string } }[] }[];
  }>("/admin/stores?fields=id,*supported_locales,*supported_locales.locale");

  const store = res.stores?.[0];
  return (store?.supported_locales ?? []).map((s) => ({
    code: s.locale_code,
    name: s.locale?.name ?? s.locale_code,
  }));
}

/** 번역 대상 필드 설정(엔티티별). 객체 응답을 배열로 펴서 돌려준다. */
export async function listTranslationSettings(): Promise<TranslationSetting[]> {
  const res = await apiFetch<{
    translation_settings: Record<
      string,
      { id: string; fields: string[]; is_active?: boolean }
    >;
  }>("/admin/translations/settings");

  return Object.entries(res.translation_settings ?? {}).map(([entity_type, v]) => ({
    id: v.id,
    entity_type,
    fields: v.fields ?? [],
    is_active: v.is_active !== false,
  }));
}

/** 특정 엔티티의 번역 대상 필드만. 설정이 없으면 빈 배열. */
export async function getTranslatableFields(entityType: string): Promise<string[]> {
  const all = await listTranslationSettings();
  const hit = all.find((s) => s.entity_type === entityType && s.is_active);
  return hit?.fields ?? [];
}

/**
 * 특정 레코드의 번역들을 언어별로 가져온다.
 * 아직 번역이 없으면 빈 객체가 돌아온다(에러 아님).
 */
export async function listTranslations(
  reference: string,
  referenceId: string
): Promise<Translation[]> {
  const qs = new URLSearchParams({
    reference,
    reference_id: referenceId,
    limit: "50",
  });
  const res = await apiFetch<{ translations: Translation[] }>(
    `/admin/translations?${qs.toString()}`
  );
  return res.translations ?? [];
}

/**
 * 번역 저장 — 없으면 만들고 있으면 고친다.
 *
 * 빈 문자열만 남은 언어는 **레코드를 지운다.** 안 그러면
 * "번역했다고 표시되는데 내용이 비어 있는" 상태가 생겨서,
 * 고객 화면에 빈 상품명이 뜨거나 번역 진행률이 거짓으로 잡힌다.
 */
export async function saveTranslations(input: {
  reference: string;
  referenceId: string;
  /** 언어코드 → (필드명 → 번역값) */
  byLocale: Record<string, Record<string, string>>;
  /** 이미 저장돼 있던 번역들(id 를 찾기 위해 필요) */
  existing: Translation[];
}): Promise<void> {
  const { reference, referenceId, byLocale, existing } = input;
  const byCode = new Map(existing.map((t) => [t.locale_code, t]));

  const create: Omit<Translation, "id">[] = [];
  const update: (Partial<Translation> & { id: string })[] = [];
  const del: string[] = [];

  for (const [locale_code, fields] of Object.entries(byLocale)) {
    // 값이 있는 필드만 남긴다(공백만 입력한 것은 미입력으로 본다)
    const filled: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      const trimmed = (v ?? "").trim();
      if (trimmed) filled[k] = trimmed;
    }

    const prev = byCode.get(locale_code);
    if (!Object.keys(filled).length) {
      if (prev) del.push(prev.id); // 다 지웠다 → 번역 레코드 자체를 제거
      continue;
    }
    if (prev) update.push({ id: prev.id, translations: filled });
    else create.push({ reference, reference_id: referenceId, locale_code, translations: filled });
  }

  if (!create.length && !update.length && !del.length) return;

  await apiFetch("/admin/translations/batch", {
    method: "POST",
    body: JSON.stringify({
      ...(create.length ? { create } : {}),
      ...(update.length ? { update } : {}),
      ...(del.length ? { delete: del } : {}),
    }),
  });

  // 저장은 끝났다. 이제 **고객 화면 캐시를 지운다.**
  //
  // 상품·카테고리를 고치면 Medusa 가 이벤트를 쏘고 백엔드 구독자가 알아서 지우는데,
  // **번역 저장은 이벤트를 발행하지 않는다.** 그래서 영어 상품명을 넣어도 고객 화면은
  // 예전 값을 계속 보여준다(상품 목록은 force-cache 라 시간이 지나도 안 바뀐다).
  // 2026-08-10 에 실제로 겪었다 — 번역을 넣었는데 화면이 계속 한국어였다.
  //
  // ⚠️ **기다리지 않는다.** 백엔드는 스토어프론트를 다시 호출하므로 최대 5초가 걸리는데,
  //    결과를 어차피 무시할 일을 운영자가 기다릴 이유가 없다. 실제로 저장 버튼이
  //    눈에 띄게 느려졌다(2026-08-11, 관리자 E2E 에서 타이밍 실패로 드러남).
  //    실패해도 무시한다 — 저장은 이미 성공했고, 여기서 에러를 던지면
  //    운영자가 "저장 실패"로 오해한다.
  void apiFetch("/admin/translations-revalidate", { method: "POST" }).catch(() => {
    // 캐시는 늦게라도 갱신된다 — 저장 흐름을 막지 않는다
  });
}

/**
 * 번역이 얼마나 채워졌는지 — "영어 안 넣은 상품이 몇 개인가"를 알기 위한 것.
 * 엔드포인트가 없거나 실패하면 null(화면에서 조용히 숨긴다).
 */
export async function getTranslationStatistics(): Promise<unknown | null> {
  try {
    return await apiFetch("/admin/translations/statistics");
  } catch {
    return null;
  }
}

/**
 * 스토어 설정 순수 로직 모듈 (t001_스토어설정 spec §4 입력검증 + 패치 빌더)
 *
 * - 이 모듈은 DOM/fetch/React 없는 순수 함수만 포함하므로 vitest 단위 테스트 가능.
 * - production 연결: apps/admin/src/lib/api/settings.ts 가 이 모듈의 타입을 사용하고,
 *   settings page.tsx 가 validateStoreInput 을 호출하여 저장 전 검증한다.
 */

export type StoreInputPayload = {
  name: string;
  default_currency_code?: string;
  supported_currency_codes?: string[];
};

export type StoreValidationError = {
  field: "name" | "default_currency_code";
  message: string;
};

/**
 * 스토어 입력 검증 (spec §4 I1·I2)
 *  I1: 스토어명 1~100자 필수
 *  I2: 기본통화는 지원통화 목록에 포함되어야 함
 */
export function validateStoreInput(input: StoreInputPayload): StoreValidationError[] {
  const errors: StoreValidationError[] = [];

  // I1: 이름 필수 + 1~100자
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    errors.push({ field: "name", message: "이름 필수" });
  } else if (trimmedName.length > 100) {
    errors.push({ field: "name", message: "이름 필수" }); // 100자 초과 = 규칙 위반
  }

  // I2: 기본통화 지원통화 포함 검증 (기본통화가 명시된 경우만)
  if (input.default_currency_code && input.supported_currency_codes) {
    const codes = input.supported_currency_codes.map((c) => c.toLowerCase());
    if (!codes.includes(input.default_currency_code.toLowerCase())) {
      errors.push({ field: "default_currency_code", message: "통화 오류" });
    }
  }

  return errors;
}

/**
 * 통화 코드 목록에서 기본통화가 보존되는지 확인
 * (spec §3 S1: 기본통화 삭제 금지)
 */
export function isDefaultCurrencyPreserved(
  defaultCurrencyCode: string,
  newCurrencyCodes: string[]
): boolean {
  return newCurrencyCodes.map((c) => c.toLowerCase()).includes(defaultCurrencyCode.toLowerCase());
}

/**
 * 통화 추가 — 중복 없이 병합
 */
export function mergeCurrencies(existing: string[], toAdd: string[]): string[] {
  const set = new Set(existing.map((c) => c.toLowerCase()));
  for (const c of toAdd) {
    set.add(c.toLowerCase());
  }
  return Array.from(set);
}

/**
 * 로케일 추가 — 중복 없이 병합
 */
export function mergeLocales(existing: string[], toAdd: string[]): string[] {
  const set = new Set(existing.map((l) => l.toLowerCase()));
  for (const l of toAdd) {
    set.add(l.toLowerCase());
  }
  return Array.from(set);
}

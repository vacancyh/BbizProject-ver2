/**
 * 지역·세금 순수 로직 모듈 (t002_지역세금 spec §4 입력검증)
 *
 * - 이 모듈은 DOM/fetch/React 없는 순수 함수만 포함하므로 vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/settings/page.tsx 의 RegionTaxTab 이
 *   validateTaxRateInput / validateRegionNameInput / KOREA_VAT_RATE 를 실제 호출.
 */

/** 한국 VAT 기본 세율 10% — spec t002 §1 */
export const KOREA_VAT_RATE = 10;

/** 세금 지역 기본 국가 코드 (단독몰 = 한국) */
export const DEFAULT_COUNTRY_CODE = "KR";

export type TaxRateValidationError = {
  field: "rate" | "name";
  message: string;
};

export type RegionNameValidationError = {
  field: "name";
  message: string;
};

/**
 * 세율 입력 검증 (spec §4 I1)
 *  I1: 세율 0~100 필수 숫자
 */
export function validateTaxRateInput(input: {
  rate: number | string;
  name?: string;
}): TaxRateValidationError[] {
  const errors: TaxRateValidationError[] = [];

  const rateNum = typeof input.rate === "string" ? parseFloat(input.rate) : input.rate;

  if (isNaN(rateNum)) {
    errors.push({ field: "rate", message: "세율 오류" });
  } else if (rateNum < 0 || rateNum > 100) {
    errors.push({ field: "rate", message: "세율 오류" });
  }

  return errors;
}

/**
 * 지역명 입력 검증 (spec §4 I2)
 *  I2: 지역명 1~50자 필수
 */
export function validateRegionNameInput(name: string): RegionNameValidationError[] {
  const errors: RegionNameValidationError[] = [];
  const trimmed = name.trim();

  if (!trimmed) {
    errors.push({ field: "name", message: "지역명 필수" });
  } else if (trimmed.length > 50) {
    errors.push({ field: "name", message: "지역명 필수" });
  }

  return errors;
}

/**
 * 기본 region 삭제 금지 검사 (spec §3 S1 — 기본 region 삭제 금지)
 * 단독몰 기준 한국 region 은 항상 1개 이상 유지.
 */
export function isDefaultRegionDeletable(
  regionIdToDelete: string,
  allRegionIds: string[],
  defaultRegionId: string
): boolean {
  if (regionIdToDelete === defaultRegionId) return false;
  return true;
}

/**
 * 세율 목록에서 한국 VAT 기본 세율(10%)이 설정되어 있는지 확인
 */
export function hasKoreaVatRate(taxRates: { rate: number | null }[]): boolean {
  return taxRates.some((r) => r.rate === KOREA_VAT_RATE);
}

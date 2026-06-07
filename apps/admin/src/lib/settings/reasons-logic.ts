/**
 * 반품·환불 사유 순수 로직 모듈 (t006_반품환불사유 spec §4 입력검증)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   - apps/admin/src/app/(admin)/settings/reasons/page.tsx 가
 *     validateReturnReasonInput / validateRefundReasonInput / canDeleteReason 을 실제 호출.
 */

// ─── 반품 사유 ───────────────────────────────────────────────────────────────

export type ReturnReasonInput = {
  /** 사유 코드 (value). spec §4 I1: 유니크, 1~30자 */
  value: string;
  /** 사유 라벨. spec §4 I2: 1~50자 필수 */
  label: string;
  description?: string;
};

export type ReturnReasonValidationError = {
  field: "value" | "label";
  message: string;
};

/**
 * 반품 사유 입력 검증 (spec §4 I1·I2)
 *  I1: 코드(value) 필수, 1~30자, 기존 코드 목록에 없어야 함(유니크)
 *  I2: 라벨 필수, 1~50자
 *
 * @param input   입력 데이터
 * @param existingValues 이미 등록된 코드 목록 (유니크 검증용, 수정 시 자신 제외 후 전달)
 */
export function validateReturnReasonInput(
  input: ReturnReasonInput,
  existingValues: string[] = []
): ReturnReasonValidationError[] {
  const errors: ReturnReasonValidationError[] = [];

  // I1: 코드 검증
  const trimmedValue = input.value.trim();
  if (!trimmedValue) {
    errors.push({ field: "value", message: "코드 필수" });
  } else if (trimmedValue.length > 30) {
    errors.push({ field: "value", message: "코드 30자 초과" });
  } else {
    const lower = trimmedValue.toLowerCase();
    const isDuplicate = existingValues.some((v) => v.toLowerCase() === lower);
    if (isDuplicate) {
      errors.push({ field: "value", message: "코드 중복" });
    }
  }

  // I2: 라벨 검증
  const trimmedLabel = input.label.trim();
  if (!trimmedLabel) {
    errors.push({ field: "label", message: "라벨 필수" });
  } else if (trimmedLabel.length > 50) {
    errors.push({ field: "label", message: "라벨 50자 초과" });
  }

  return errors;
}

// ─── 환불 사유 ───────────────────────────────────────────────────────────────

export type RefundReasonInput = {
  /** 사유 코드. spec §4 I1: 유니크, 1~30자 */
  code: string;
  /** 사유 라벨. spec §4 I2: 1~50자 필수 */
  label: string;
  description?: string;
};

export type RefundReasonValidationError = {
  field: "code" | "label";
  message: string;
};

/**
 * 환불 사유 입력 검증 (spec §4 I1·I2)
 *  I1: 코드(code) 필수, 1~30자, 기존 코드 목록에 없어야 함(유니크)
 *  I2: 라벨 필수, 1~50자
 *
 * @param input        입력 데이터
 * @param existingCodes 이미 등록된 코드 목록 (유니크 검증용, 수정 시 자신 제외 후 전달)
 */
export function validateRefundReasonInput(
  input: RefundReasonInput,
  existingCodes: string[] = []
): RefundReasonValidationError[] {
  const errors: RefundReasonValidationError[] = [];

  // I1: 코드 검증
  const trimmedCode = input.code.trim();
  if (!trimmedCode) {
    errors.push({ field: "code", message: "코드 필수" });
  } else if (trimmedCode.length > 30) {
    errors.push({ field: "code", message: "코드 30자 초과" });
  } else {
    const lower = trimmedCode.toLowerCase();
    const isDuplicate = existingCodes.some((c) => c.toLowerCase() === lower);
    if (isDuplicate) {
      errors.push({ field: "code", message: "코드 중복" });
    }
  }

  // I2: 라벨 검증
  const trimmedLabel = input.label.trim();
  if (!trimmedLabel) {
    errors.push({ field: "label", message: "라벨 필수" });
  } else if (trimmedLabel.length > 50) {
    errors.push({ field: "label", message: "라벨 50자 초과" });
  }

  return errors;
}

// ─── 공통: 사용중 사유 삭제 차단 ──────────────────────────────────────────

/**
 * 사유 코드가 사용 중인지 확인 (spec §8 C1: 사용중 코드 삭제 금지)
 *
 * @param code          삭제 시도 코드
 * @param usedCodes     현재 사용 중인 코드 목록 (d2 반품/환불 접수에서 참조 중인 코드)
 */
export function canDeleteReason(code: string, usedCodes: string[]): boolean {
  const lower = code.toLowerCase();
  return !usedCodes.some((c) => c.toLowerCase() === lower);
}

/**
 * API 키 순수 로직 모듈 (t004_API연동키 spec §4 입력검증)
 *
 * - DOM/fetch/React 없는 순수 함수 전용 → vitest 단위 테스트 가능.
 * - production 연결:
 *     apps/admin/src/lib/api/api-keys.ts 가 이 모듈의 타입을 사용하고,
 *     api-keys/page.tsx 가 validateApiKeyInput / maskToken 을 실제 호출한다.
 */

import type { ApiKeyType } from "@/lib/api/api-keys";

export type ApiKeyInputPayload = {
  type: string;
  title: string;
};

export type ApiKeyValidationError = {
  field: "type" | "title";
  message: string;
};

/**
 * API 키 입력 검증 (spec §4)
 *  I1: type — publishable | secret 중 하나여야 함
 *  I2: title — 1~50자 필수
 */
export function validateApiKeyInput(input: ApiKeyInputPayload): ApiKeyValidationError[] {
  const errors: ApiKeyValidationError[] = [];

  // I1: 종류 검증
  const validTypes: ApiKeyType[] = ["publishable", "secret"];
  if (!validTypes.includes(input.type as ApiKeyType)) {
    errors.push({ field: "type", message: "종류 오류" });
  }

  // I2: 제목 1~50자 필수
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    errors.push({ field: "title", message: "제목 필수" });
  } else if (trimmedTitle.length > 50) {
    errors.push({ field: "title", message: "제목 필수" }); // 50자 초과 = 규칙 위반
  }

  return errors;
}

/**
 * 토큰 마스킹 — 앞 4자리 보존 후 나머지를 ***로 변환 (spec §8 C1: 생성 후 마스킹)
 * 이미 마스킹된 redacted 값은 그대로 반환.
 */
export function maskToken(token: string): string {
  if (!token) return "****";
  // Medusa redacted 형식은 보통 "sk_****" 등으로 이미 마스킹돼 있음
  // 평문 토큰이 들어오면 앞 8자 + *** 처리
  if (token.includes("*")) return token;
  const visible = token.slice(0, 8);
  return `${visible}****`;
}

/**
 * 키가 폐기 상태인지 확인
 */
export function isRevoked(revokedAt: string | null): boolean {
  return revokedAt !== null;
}

/**
 * ApiKeyType 한글 레이블 반환
 */
export function apiKeyTypeLabel(type: ApiKeyType): string {
  return type === "publishable" ? "Publishable" : "Secret";
}

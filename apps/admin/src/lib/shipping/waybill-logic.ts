/**
 * 운송장(송장)·택배사 순수 로직 모듈 (d6 t003_국내택배연동 spec §9)
 *
 * - DOM/fetch/React 없는 순수 함수만 → vitest 단위 테스트 가능.
 * - 기존 `lib/api/shipping.ts` 의 KR_CARRIERS(cj/epost/hanjin/lotte/logen) 코드 체계와 정합.
 * - 백엔드 실제 택배사 API 연동(tracking/송장발급)은 미구현(mock) — 본 모듈은 송장번호 형식검증 +
 *   배송추적 URL 매핑 룰만 제공(클라/서버 공용 가능).
 *
 * 주: 택배사별 운송장번호 자릿수는 통상 형식 근사치이며, 실제 연동 시 택배사 규격에 맞춰 조정 가능하도록
 *     CARRIER_RULES 단일 테이블로 분리(검증 규칙 분산 방지, §V0).
 */

/** 택배사별 규칙 — 운송장 형식(정규식) + 추적 URL 템플릿({n}=송장번호) */
export type CarrierRule = {
  code: string;
  name: string;
  /** 운송장번호 형식(정규화된 숫자 문자열 기준) */
  pattern: RegExp;
  /** 추적 URL 템플릿 ({n} 치환) */
  trackingUrlTemplate: string;
};

export const CARRIER_RULES: Record<string, CarrierRule> = {
  cj: {
    code: "cj",
    name: "CJ대한통운",
    pattern: /^\d{10}$|^\d{12}$/,
    trackingUrlTemplate: "https://trace.cjlogistics.com/next/tracking.html?wblNo={n}",
  },
  epost: {
    code: "epost",
    name: "우체국택배",
    pattern: /^\d{13}$/,
    trackingUrlTemplate: "https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={n}",
  },
  hanjin: {
    code: "hanjin",
    name: "한진택배",
    pattern: /^\d{10}$|^\d{12}$/,
    trackingUrlTemplate: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnum={n}",
  },
  lotte: {
    code: "lotte",
    name: "롯데택배",
    pattern: /^\d{12}$/,
    trackingUrlTemplate: "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={n}",
  },
  logen: {
    code: "logen",
    name: "로젠택배",
    pattern: /^\d{11}$/,
    trackingUrlTemplate: "https://www.ilogen.com/web/personal/trace/{n}",
  },
};

/** 알려진 택배사 코드 여부. */
export function isKnownCarrier(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(CARRIER_RULES, code);
}

/** 운송장번호 정규화 — 하이픈/공백 제거(숫자만). */
export function normalizeTrackingNumber(raw: string): string {
  return (raw ?? "").replace(/[^0-9]/g, "");
}

/**
 * 운송장번호 형식 검증 (택배사별 자릿수)
 * @returns { valid, error? }
 */
export function validateTrackingNumber(
  carrierCode: string,
  rawNumber: string
): { valid: boolean; error?: string } {
  const rule = CARRIER_RULES[carrierCode];
  if (!rule) {
    return { valid: false, error: `알 수 없는 택배사: ${carrierCode}` };
  }
  const n = normalizeTrackingNumber(rawNumber);
  if (!n) {
    return { valid: false, error: "운송장번호가 비어 있습니다" };
  }
  if (!rule.pattern.test(n)) {
    return { valid: false, error: `${rule.name} 운송장번호 형식이 올바르지 않습니다` };
  }
  return { valid: true };
}

/** 배송추적 URL 생성(알 수 없는 택배사/빈 번호는 null). */
export function buildTrackingUrl(carrierCode: string, rawNumber: string): string | null {
  const rule = CARRIER_RULES[carrierCode];
  if (!rule) return null;
  const n = normalizeTrackingNumber(rawNumber);
  if (!n) return null;
  return rule.trackingUrlTemplate.replace("{n}", n);
}

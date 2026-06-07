/**
 * 택배사 어댑터 스텁(mock) 구현
 *
 * 실 택배사 API 계약·키 확보 전까지 사용하는 mock 구현입니다.
 * 모든 스텁 구현체는 CarrierAdapter 인터페이스를 준수합니다.
 *
 * TODO(사장님결정): 택배사 API 키/계약 필요 — 아래 주석의 TODO 를 확인하세요.
 *   실연동 시 각 StubAdapter 를 실제 구현체로 교체하고,
 *   CARRIER_ADAPTERS 레지스트리에 재등록하면 됩니다.
 *
 * spec: d6 배송관리 — 택배사 어댑터 스텁
 */
import type { CarrierAdapter, WaybillIssueRequest, WaybillIssueResult, TrackingResult } from "./interface"

/** 스텁 기본 추적 URL 패턴 (택배사 공개 URL — API 키 불필요) */
const TRACKING_URL_TEMPLATES: Record<string, string> = {
  cj:     "https://trace.cjlogistics.com/next/tracking.html?wblNo={n}",
  epost:  "https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={n}",
  hanjin: "https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnum={n}",
  lotte:  "https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={n}",
  logen:  "https://www.ilogen.com/web/personal/trace/{n}",
}

/** 택배사별 운송장번호 형식 패턴 */
const TRACKING_PATTERNS: Record<string, RegExp> = {
  cj:     /^\d{10}$|^\d{12}$/,
  epost:  /^\d{13}$/,
  hanjin: /^\d{10}$|^\d{12}$/,
  lotte:  /^\d{12}$/,
  logen:  /^\d{11}$/,
}

/**
 * 스텁 어댑터 생성 팩토리.
 *
 * issueWaybill / trackShipment 는 실 API 미구현으로 Error throw.
 * getTrackingUrl 은 공개 URL 패턴 기반으로 생성 (API 불필요).
 */
function createStubAdapter(
  code: string,
  name: string,
): CarrierAdapter {
  return {
    code,
    name,

    validateTrackingNumber(trackingNumber: string): boolean {
      const pattern = TRACKING_PATTERNS[code]
      if (!pattern) return false
      return pattern.test(trackingNumber)
    },

    getTrackingUrl(trackingNumber: string): string {
      const template = TRACKING_URL_TEMPLATES[code]
      if (!template || !trackingNumber) return ""
      return template.replace("{n}", trackingNumber)
    },

    async issueWaybill(_request: WaybillIssueRequest): Promise<WaybillIssueResult> {
      // TODO(사장님결정): 택배사 API 키/계약 필요
      // 실연동 시 해당 택배사 REST API 호출로 교체하세요.
      throw new Error(
        `[${name}] 운송장 발급 API 미구현: 택배사 API 키/계약 필요. ` +
        `TODO(사장님결정): ${name} API 연동 키·계약 확보 후 이 어댑터를 교체하세요.`
      )
    },

    async trackShipment(_trackingNumber: string): Promise<TrackingResult> {
      // TODO(사장님결정): 택배사 API 키/계약 필요
      // 일부 택배사는 API 키 없이 스크래핑 가능하나, 약관 위반 가능성 있음.
      // 실연동 시 해당 택배사 추적 API 호출로 교체하세요.
      throw new Error(
        `[${name}] 배송추적 API 미구현: 택배사 API 키/계약 필요. ` +
        `TODO(사장님결정): ${name} API 연동 키·계약 확보 후 이 어댑터를 교체하세요.`
      )
    },
  }
}

/** 택배사 코드 → 어댑터 레지스트리 */
export const CARRIER_ADAPTERS: Record<string, CarrierAdapter> = {
  cj:     createStubAdapter("cj",     "CJ대한통운"),
  epost:  createStubAdapter("epost",  "우체국택배"),
  hanjin: createStubAdapter("hanjin", "한진택배"),
  lotte:  createStubAdapter("lotte",  "롯데택배"),
  logen:  createStubAdapter("logen",  "로젠택배"),
}

/**
 * 택배사 어댑터 조회.
 *
 * @param code  택배사 코드 (cj | epost | hanjin | lotte | logen)
 * @returns 어댑터 인스턴스 (없으면 null)
 */
export function getCarrierAdapter(code: string): CarrierAdapter | null {
  return CARRIER_ADAPTERS[code] ?? null
}

/**
 * 택배사 어댑터 모듈 진입점 (carrier-adapter)
 *
 * 역할: 국내 택배사 연동 인터페이스 + 스텁(mock) 레지스트리 export.
 * 현재는 스텁만 존재하며, 실 택배사 API 계약·키 확보 후 각 어댑터를 교체합니다.
 *
 * TODO(사장님결정): 택배사 API 키/계약 필요 — stub.ts 의 주석 참고.
 *
 * spec: d6 배송관리 — 택배사 어댑터
 * 주의: 본 모듈은 Medusa Module(DB 서비스) 이 아닌 순수 TS 유틸 라이브러리입니다.
 *   medusa-config.ts 등록 불필요. bulk-ship/route.ts 등에서 직접 import 합니다.
 */
export type {
  CarrierAdapter,
  WaybillIssueRequest,
  WaybillIssueResult,
  TrackingResult,
} from "./interface"

export { CARRIER_ADAPTERS, getCarrierAdapter } from "./stub"

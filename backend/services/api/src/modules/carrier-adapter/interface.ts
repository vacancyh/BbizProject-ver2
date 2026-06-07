/**
 * 택배사 어댑터 인터페이스 (carrier-adapter)
 *
 * 국내 택배사 실연동을 위한 인터페이스를 정의합니다.
 * 현재는 스텁(mock) 구현만 존재하며, 실 택배사 API 계약·키 확보 후 교체하도록
 * 설계되었습니다.
 *
 * TODO(사장님결정): 택배사 API 키/계약 필요
 *   - CJ대한통운 OPEN API: https://www.cjlogistics.com/ko/tool/parcel/tracking
 *   - 우체국택배 Open API: https://openapi.epost.go.kr
 *   - 한진택배 API: 영업 계약 후 별도 발급
 *   - 롯데택배 API: 영업 계약 후 별도 발급
 *   - 로젠택배 API: 영업 계약 후 별도 발급
 *
 * 실연동 교체 방법:
 *   1. 각 택배사별 CarrierAdapter 구현 클래스 작성
 *   2. CARRIER_ADAPTERS 레지스트리에 등록
 *   3. bulk-ship/route.ts 의 buildBulkShipLabel 교체 불필요 (어댑터 주입만)
 *   4. createShipmentWorkflow labels 의 tracking_url/label_url 채워 넣기
 *
 * spec: d6 배송관리 — 택배사 어댑터 인터페이스
 */

/** 운송장 발급 요청 */
export type WaybillIssueRequest = {
  /** 송하인 정보 */
  sender: {
    name: string
    phone: string
    address: string
    postal_code: string
  }
  /** 수하인 정보 */
  recipient: {
    name: string
    phone: string
    address: string
    postal_code: string
  }
  /** 상품 정보 */
  product: {
    name: string
    quantity: number
    weight_kg?: number
  }
  /** 내부 주문 참조 ID */
  order_id: string
}

/** 운송장 발급 결과 */
export type WaybillIssueResult = {
  /** 발급된 운송장번호 */
  tracking_number: string
  /** 배송추적 URL (고객용) */
  tracking_url: string
  /** 운송장 라벨 URL (인쇄용) */
  label_url: string
  /** 발급 일시 (ISO 8601) */
  issued_at: string
}

/** 배송 추적 결과 */
export type TrackingResult = {
  /** 현재 배송 상태 */
  status: string
  /** 위치 정보 */
  location?: string | null
  /** 상태 변경 일시 (ISO 8601) */
  updated_at: string
  /** 상세 이력 */
  events: Array<{
    status: string
    location?: string | null
    time: string
    description?: string | null
  }>
}

/**
 * 택배사 어댑터 인터페이스.
 *
 * 모든 실 택배사 구현체는 본 인터페이스를 구현해야 합니다.
 * 미구현 메서드는 스텁(mock) 응답을 반환합니다.
 */
export interface CarrierAdapter {
  /** 택배사 코드 (cj | epost | hanjin | lotte | logen) */
  readonly code: string
  /** 택배사 표시명 */
  readonly name: string

  /**
   * 운송장번호 형식 검증 (API 호출 없이 로컬 검증).
   *
   * @param trackingNumber 정규화된 숫자 운송장번호
   */
  validateTrackingNumber(trackingNumber: string): boolean

  /**
   * 배송추적 URL 생성 (API 키 불필요 — 공개 URL 패턴).
   *
   * @param trackingNumber 정규화된 운송장번호
   */
  getTrackingUrl(trackingNumber: string): string

  /**
   * 운송장 발급 (API 키/계약 필요).
   *
   * TODO(사장님결정): 택배사 API 키/계약 필요 — 현재 스텁 구현만 존재합니다.
   *
   * @param request 발급 요청 정보
   * @throws Error API 키 미설정 또는 발급 실패 시
   */
  issueWaybill(request: WaybillIssueRequest): Promise<WaybillIssueResult>

  /**
   * 배송 추적 조회 (API 키 필요 택배사도 있음).
   *
   * TODO(사장님결정): 일부 택배사는 API 키/계약 필요 — 현재 스텁 구현만 존재합니다.
   *
   * @param trackingNumber 정규화된 운송장번호
   * @throws Error 조회 실패 시
   */
  trackShipment(trackingNumber: string): Promise<TrackingResult>
}

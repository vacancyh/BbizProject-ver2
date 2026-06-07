/**
 * 기본 시스템 정책 시드 정의.
 *
 * 한국형 운영 정책 통합(관리자_설계.md §5.3). 값은 운영 중 권한 관리자(SUPER)가 변경.
 * value_type = FE 입력 위젯 결정용(number/boolean/string).
 */
export const DEFAULT_POLICIES: {
  key: string
  label: string
  category: string
  value: unknown
  value_type: string
  description: string
}[] = [
  {
    key: "order.auto_cancel_hours",
    label: "미입금 자동취소(시간)",
    category: "주문",
    value: 72,
    value_type: "number",
    description: "가상계좌 미입금 주문을 자동 취소하기까지의 시간(시간 단위).",
  },
  {
    key: "refund.sla_business_days",
    label: "환불 처리 기한(영업일)",
    category: "환불",
    value: 3,
    value_type: "number",
    description: "청약철회 통지 후 환불 완료 기한(전자상거래법 §18 ①, 영업일).",
  },
  {
    key: "withdrawal.period_days",
    label: "청약철회 기간(일)",
    category: "환불",
    value: 7,
    value_type: "number",
    description: "수령일 기준 청약철회 가능 기간(전자상거래법 §17 ①, 달력일).",
  },
  {
    key: "point.expire_months",
    label: "적립금 유효기간(개월)",
    category: "적립",
    value: 12,
    value_type: "number",
    description: "적립금 소멸까지의 유효기간(개월).",
  },
  {
    key: "security.admin_session_minutes",
    label: "관리자 세션 만료(분)",
    category: "보안",
    value: 120,
    value_type: "number",
    description: "관리자 미활동 시 세션 자동 만료 시간(분).",
  },
  {
    key: "maintenance.enabled",
    label: "점검 모드",
    category: "운영",
    value: false,
    value_type: "boolean",
    description: "점검 모드 활성화 시 고객 노출을 차단합니다.",
  },
  {
    key: "membership.tiers",
    label: "회원 등급 구간",
    category: "회원",
    // ⚠️ 예시 초기값(Rule One) — 확정 정책 아님. 운영 정책은 정책 화면/seed 로 사장님이 확정.
    value: [
      { name: "일반", minAmount: 0, earnRate: 0.5 },
      { name: "실버", minAmount: 300000, earnRate: 1 },
      { name: "골드", minAmount: 1000000, earnRate: 2 },
      { name: "VIP", minAmount: 3000000, earnRate: 3 },
    ],
    value_type: "json",
    description: "회원 등급별 누적금액 구간(minAmount, 원)과 적립률(earnRate, %). 단조 증가·0~100% 검증.",
  },
  {
    key: "settlement.pg_fee_rate",
    label: "PG 수수료율(%)",
    category: "정산",
    // ⚠️ 예시 초기값(Rule One) 0% — PG 계약 확정 시 입력. 0 이면 순정산=매출-환불.
    value: 0,
    value_type: "number",
    description: "정산 순액 계산 시 매출에 적용할 PG 수수료율(%). PG 계약 기반 — 미확정 시 0.",
  },
]

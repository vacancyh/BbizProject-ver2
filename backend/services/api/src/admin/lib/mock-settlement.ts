// 정산 관리 임시(mock) 데이터.
// ⚠️ 실제 연동 시: 결제/환불/수수료/입금 내역 API 결과를 동일 타입으로 매핑해 교체하세요.
//    화면은 SettlementData 타입에만 의존하므로 데이터 출처만 바꾸면 됩니다.
import type { BarItem } from "../components/charts"
import type { StatusTone } from "../components/admin-status-badge"
import type { KpiDir } from "../components/admin-kpi-card"

export type SettlementTabKey = "dashboard" | "history" | "unsettled" | "fee" | "refund" | "settings"

export type SettlementTab = { key: SettlementTabKey; label: string; count?: number }

export const settlementTabs: SettlementTab[] = [
  { key: "dashboard", label: "정산 대시보드" },
  { key: "history", label: "정산 내역" },
  { key: "unsettled", label: "미정산 내역", count: 6 },
  { key: "fee", label: "수수료 관리" },
  { key: "refund", label: "환불/차감 내역", count: 4 },
  { key: "settings", label: "정산 설정" },
]

export type SettlementKpi = { key: string; label: string; value: string; delta: number; dir: KpiDir; sub: string }

export const settlementKpis: SettlementKpi[] = [
  { key: "scheduled", label: "정산 예정 금액", value: "₩38,420,000", delta: 4.1, dir: "up", sub: "차주 정산 예정" },
  { key: "done", label: "이번 달 정산 완료", value: "₩142,800,000", delta: 11.2, dir: "up", sub: "전월 ₹128,400,000" },
  { key: "unsettled", label: "미정산 금액", value: "₩9,640,000", delta: -6.3, dir: "down", sub: "6건 대기" },
  { key: "fee", label: "이번 달 수수료", value: "₩4,284,000", delta: 3.0, dir: "up", sub: "평균 수수료율 3.0%" },
]

/** 월별 정산액 추이 (막대) */
export const settlementTrend: BarItem[] = [
  { label: "1월", value: 98_400_000, color: "#2563EB" },
  { label: "2월", value: 112_300_000, color: "#2563EB" },
  { label: "3월", value: 120_900_000, color: "#2563EB" },
  { label: "4월", value: 128_400_000, color: "#2563EB" },
  { label: "5월", value: 142_800_000, color: "#0EA5E9" },
]

export type SettlementRow = {
  period: string
  payout: number
  fee: number
  refund: number
  net: number
  status: string
  tone: StatusTone
  paidAt: string
}

export const settlementHistory: SettlementRow[] = [
  { period: "2026.05.16~05.22", payout: 34_200_000, fee: 1_026_000, refund: 420_000, net: 32_754_000, status: "정산완료", tone: "success", paidAt: "2026.05.27" },
  { period: "2026.05.09~05.15", payout: 31_800_000, fee: 954_000, refund: 180_000, net: 30_666_000, status: "정산완료", tone: "success", paidAt: "2026.05.20" },
  { period: "2026.05.02~05.08", payout: 29_500_000, fee: 885_000, refund: 0, net: 28_615_000, status: "정산완료", tone: "success", paidAt: "2026.05.13" },
]

export const settlementUnsettled: SettlementRow[] = [
  { period: "2026.05.23~05.29", payout: 38_420_000, fee: 1_152_600, refund: 320_000, net: 36_947_400, status: "정산대기", tone: "warning", paidAt: "예정 2026.06.03" },
  { period: "2026.05.30~05.30", payout: 9_640_000, fee: 289_200, refund: 0, net: 9_350_800, status: "집계중", tone: "info", paidAt: "-" },
]

export type FeeRow = { method: string; rate: string; settlementCycle: string; note: string }

export const settlementFees: FeeRow[] = [
  { method: "신용/체크카드", rate: "2.8%", settlementCycle: "주 1회 (D+5)", note: "PG 기본 요율" },
  { method: "계좌이체", rate: "1.5%", settlementCycle: "주 1회 (D+5)", note: "" },
  { method: "간편결제", rate: "3.2%", settlementCycle: "주 1회 (D+5)", note: "카카오/네이버페이" },
  { method: "휴대폰 결제", rate: "5.5%", settlementCycle: "월 1회 (익월 10일)", note: "" },
]

export type RefundRow = {
  orderNo: string
  customer: string
  reason: string
  amount: number
  type: string
  tone: StatusTone
  requestedAt: string
}

export const settlementRefunds: RefundRow[] = [
  { orderNo: "20260530-0179", customer: "최O우", reason: "단순 변심", amount: 24_500, type: "환불", tone: "warning", requestedAt: "2026.05.30 12:44" },
  { orderNo: "20260530-0175", customer: "정O민", reason: "상품 불량", amount: 62_000, type: "환불", tone: "danger", requestedAt: "2026.05.30 11:31" },
  { orderNo: "20260529-0140", customer: "서O빈", reason: "부분 취소", amount: 18_000, type: "차감", tone: "neutral", requestedAt: "2026.05.29 18:02" },
  { orderNo: "20260528-0121", customer: "유O라", reason: "배송 지연", amount: 5_000, type: "보상 차감", tone: "info", requestedAt: "2026.05.28 09:15" },
]

export type SettlementSettings = {
  cycle: string
  bankName: string
  account: string
  holder: string
  autoConfirm: boolean
}

export const settlementSettings: SettlementSettings = {
  cycle: "주 1회 (매주 수요일, D+5)",
  bankName: "국민은행",
  account: "1234-01-567890",
  holder: "(주)샵커머스",
  autoConfirm: false,
}

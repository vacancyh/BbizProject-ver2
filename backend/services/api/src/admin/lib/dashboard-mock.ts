// 관리자 대시보드 임시(mock) 데이터.
// ⚠️ 실제 API 연결 시: 아래 dashboardMock 상수를 admin API 호출 결과로 교체하세요.
//    (예: useQuery 로 /admin/dashboard-summary 호출 → 동일한 DashboardData 형태로 매핑)
//    화면 컴포넌트는 DashboardData 타입에만 의존하므로 데이터 출처만 바꾸면 됩니다.
// 데이터 모델은 Claude Design ZIP(admin-data.js)의 대시보드 구조를 정합 이식했습니다.
import type { BarItem, DonutSegment, LineSeries } from "../components/charts"
import type { StatusTone } from "../components/admin-status-badge"
import type { KpiDir } from "../components/admin-kpi-card"

export type DashboardKpi = {
  key: string
  label: string
  value: string
  delta: number
  dir: KpiDir
  sub: string
  attn?: boolean
  to?: string
}

export type RecentOrder = {
  id: string
  display: string
  customer: string
  summary: string
  total: number
  status: string
  tone: StatusTone
}

export type QueueItem = {
  key: string
  tone: StatusTone
  count: number
  title: string
  sub: string
  hot: boolean
  to?: string
}

export type TopProduct = {
  name: string
  category: string
  qty: number
  revenue: number
}

export type LowStockItem = {
  name: string
  category: string
  stock: number
  label: string
  tone: StatusTone
}

export type DashboardAlert = {
  id: string
  level: "danger" | "warning" | "info"
  message: string
}

export type DashboardData = {
  date: string
  updated: string
  kpis: DashboardKpi[]
  salesTrend: { labels: string[]; series: LineSeries[] }
  orderStatus: DonutSegment[]
  categorySales: BarItem[]
  queue: QueueItem[]
  recentOrders: RecentOrder[]
  topProducts: TopProduct[]
  lowStock: LowStockItem[]
  alerts: DashboardAlert[]
}

export const dashboardMock: DashboardData = {
  date: "2026년 5월 30일 (토)",
  updated: "방금 전",
  kpis: [
    { key: "sales", label: "오늘 매출", value: "₩12,840,000", delta: 8.2, dir: "up", sub: "어제 ₩11,860,000" },
    { key: "orders", label: "오늘 주문", value: "184건", delta: 6.9, dir: "up", sub: "어제 172건", to: "/orders" },
    { key: "pay", label: "결제 대기", value: "23건", delta: -12, dir: "down", sub: "1시간 내 9건", to: "/orders" },
    { key: "ready", label: "배송 준비", value: "41건", delta: 5, dir: "up", sub: "금일 출고 예정", attn: true, to: "/shipping" },
    { key: "refund", label: "취소·환불 요청", value: "10건", delta: 2, dir: "up", sub: "미처리 7건", attn: true, to: "/orders" },
    { key: "signup", label: "신규 회원", value: "37명", delta: -9.7, dir: "down", sub: "어제 41명", to: "/customers" },
  ],
  salesTrend: {
    labels: ["5/24", "5/25", "5/26", "5/27", "5/28", "5/29", "5/30"],
    series: [
      { name: "매출", color: "#2563EB", data: [9_200_000, 10_100_000, 8_700_000, 11_200_000, 10_800_000, 11_860_000, 12_840_000] },
      { name: "순매출", color: "#94A3B8", data: [8_400_000, 9_300_000, 7_900_000, 10_300_000, 9_900_000, 10_900_000, 11_800_000] },
    ],
  },
  orderStatus: [
    { label: "결제완료", value: 23, color: "#2563EB" },
    { label: "배송준비", value: 41, color: "#0EA5E9" },
    { label: "배송중", value: 88, color: "#94A3B8" },
    { label: "배송완료", value: 1102, color: "#1E293B" },
    { label: "취소·환불", value: 10, color: "#D97706" },
  ],
  categorySales: [
    { label: "상의", value: 38, color: "#2563EB" },
    { label: "하의", value: 24, color: "#0EA5E9" },
    { label: "아우터", value: 21, color: "#94A3B8" },
    { label: "신발·잡화", value: 17, color: "#1E293B" },
  ],
  queue: [
    { key: "pay", tone: "primary", count: 23, title: "신규 결제 완료", sub: "배송 준비 필요", hot: false, to: "/orders" },
    { key: "ready", tone: "warning", count: 41, title: "배송 준비", sub: "송장 등록 대기", hot: true, to: "/shipping" },
    { key: "refund", tone: "danger", count: 7, title: "취소·환불 요청", sub: "24시간 내 처리", hot: true, to: "/orders" },
    { key: "inquiry", tone: "neutral", count: 18, title: "미답변 문의", sub: "CS 응대 필요", hot: false },
  ],
  recentOrders: [
    { id: "1", display: "#20260530-0184", customer: "김O연", summary: "프리미엄 코튼 티셔츠 외 2건", total: 78_000, status: "결제완료", tone: "primary" },
    { id: "2", display: "#20260530-0183", customer: "이O준", summary: "경량 패딩 자켓 (블랙)", total: 129_000, status: "배송준비", tone: "info" },
    { id: "3", display: "#20260530-0181", customer: "박O서", summary: "베이직 데일리 슬랙스", total: 39_000, status: "배송중", tone: "neutral" },
    { id: "4", display: "#20260530-0179", customer: "최O우", summary: "논슬립 러닝 양말 3팩", total: 24_500, status: "취소요청", tone: "warning" },
    { id: "5", display: "#20260530-0175", customer: "정O민", summary: "오가닉 코튼 후드 집업", total: 62_000, status: "환불요청", tone: "danger" },
  ],
  topProducts: [
    { name: "프리미엄 코튼 오버핏 티셔츠", category: "상의", qty: 420, revenue: 10_920_000 },
    { name: "베이직 데일리 슬랙스", category: "하의", qty: 374, revenue: 14_586_000 },
    { name: "경량 패딩 자켓 (블랙)", category: "아우터", qty: 328, revenue: 42_312_000 },
    { name: "오가닉 코튼 후드 집업", category: "상의", qty: 236, revenue: 14_632_000 },
    { name: "캐주얼 캔버스 스니커즈", category: "신발·잡화", qty: 190, revenue: 10_450_000 },
  ],
  lowStock: [
    { name: "논슬립 러닝 양말 3팩", category: "잡화", stock: 0, label: "품절", tone: "danger" },
    { name: "경량 패딩 자켓 (블랙)", category: "아우터", stock: 12, label: "품절 임박", tone: "warning" },
    { name: "오가닉 코튼 후드 집업", category: "상의", stock: 18, label: "품절 임박", tone: "warning" },
    { name: "베이직 데일리 슬랙스", category: "하의", stock: 23, label: "재고 부족", tone: "warning" },
  ],
  alerts: [
    { id: "a1", level: "danger", message: "환불 요청 7건이 24시간 내 처리 대기 중입니다." },
    { id: "a2", level: "warning", message: "품절 임박 상품 4건을 확인하세요." },
    { id: "a3", level: "info", message: "오늘 신규 회원 37명이 가입했습니다." },
  ],
}

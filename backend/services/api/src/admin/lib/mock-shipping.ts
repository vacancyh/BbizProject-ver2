// 배송 관리 임시(mock) 데이터.
// ⚠️ 실제 연동 시: 주문/택배사/송장 API 결과를 동일 타입으로 매핑해 교체하세요.
//    화면은 ShippingData 타입에만 의존하므로 데이터 출처만 바꾸면 됩니다.
import type { StatusTone } from "../components/admin-status-badge"

export type ShipmentTabKey = "waiting" | "ready" | "shipping" | "done" | "invoice" | "settings"

export type ShipmentRow = {
  orderNo: string
  customer: string
  items: string
  courier: string
  tracking: string
  requestedAt: string
  status: string
  tone: StatusTone
}

export type ShippingTab = { key: ShipmentTabKey; label: string; count?: number }

export const shippingTabs: ShippingTab[] = [
  { key: "waiting", label: "배송 대기", count: 23 },
  { key: "ready", label: "배송 준비", count: 41 },
  { key: "shipping", label: "배송 중", count: 88 },
  { key: "done", label: "배송 완료", count: 1102 },
  { key: "invoice", label: "송장 관리" },
  { key: "settings", label: "배송 설정" },
]

export const shippingRows: Record<Exclude<ShipmentTabKey, "settings">, ShipmentRow[]> = {
  waiting: [
    { orderNo: "20260530-0184", customer: "김O연", items: "프리미엄 코튼 티셔츠 외 2건", courier: "-", tracking: "-", requestedAt: "2026.05.30 14:22", status: "결제완료", tone: "primary" },
    { orderNo: "20260530-0182", customer: "한O리", items: "베이직 슬랙스", courier: "-", tracking: "-", requestedAt: "2026.05.30 13:40", status: "결제완료", tone: "primary" },
  ],
  ready: [
    { orderNo: "20260530-0183", customer: "이O준", items: "경량 패딩 자켓 (블랙)", courier: "CJ대한통운", tracking: "미발급", requestedAt: "2026.05.30 13:58", status: "배송준비", tone: "info" },
    { orderNo: "20260530-0180", customer: "오O진", items: "오가닉 후드 집업 외 1건", courier: "한진택배", tracking: "미발급", requestedAt: "2026.05.30 13:05", status: "배송준비", tone: "info" },
  ],
  shipping: [
    { orderNo: "20260530-0181", customer: "박O서", items: "베이직 데일리 슬랙스", courier: "CJ대한통운", tracking: "123456780000", requestedAt: "2026.05.30 13:10", status: "배송중", tone: "neutral" },
  ],
  done: [
    { orderNo: "20260529-0142", customer: "강O호", items: "캐주얼 스니커즈", courier: "롯데택배", tracking: "456123780000", requestedAt: "2026.05.29 10:05", status: "배송완료", tone: "success" },
  ],
  invoice: [
    { orderNo: "20260530-0183", customer: "이O준", items: "경량 패딩 자켓 (블랙)", courier: "CJ대한통운", tracking: "미발급", requestedAt: "2026.05.30 13:58", status: "송장 대기", tone: "warning" },
    { orderNo: "20260530-0181", customer: "박O서", items: "베이직 데일리 슬랙스", courier: "CJ대한통운", tracking: "123456780000", requestedAt: "2026.05.30 13:10", status: "발급완료", tone: "success" },
  ],
}

export type ShippingSettings = {
  baseFee: number
  freeThreshold: number
  defaultCourier: string
  jejuExtraFee: number
}

export const shippingSettings: ShippingSettings = {
  baseFee: 3_000,
  freeThreshold: 50_000,
  defaultCourier: "CJ대한통운",
  jejuExtraFee: 3_000,
}

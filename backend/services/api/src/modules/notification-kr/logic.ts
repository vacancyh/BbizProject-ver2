/**
 * 알림 순수 로직 — 2026-08-03 신설
 * DB·네트워크 없이 테스트 가능한 계산만 둔다(§V0 단일 진실).
 */

/** 기본 제공 알림 시점 — 한국 온라인 쇼핑몰에서 최소한 필요한 것들 */
export const NOTIFICATION_EVENTS = [
  { event: "order.placed", name: "주문 접수", desc: "고객이 주문을 완료했을 때" },
  { event: "order.paid", name: "입금 확인", desc: "결제가 승인되었을 때" },
  { event: "order.shipped", name: "발송 안내", desc: "운송장이 등록되었을 때" },
  { event: "order.delivered", name: "배송 완료", desc: "배송이 완료되었을 때" },
  { event: "order.canceled", name: "주문 취소", desc: "주문이 취소되었을 때" },
  { event: "order.refunded", name: "환불 완료", desc: "환불이 처리되었을 때" },
  { event: "customer.created", name: "가입 환영", desc: "회원가입이 완료되었을 때" },
  { event: "point.expiring", name: "적립금 소멸 예정", desc: "적립금 소멸이 임박했을 때" },
  { event: "restock.available", name: "재입고 알림", desc: "품절 상품이 재입고되었을 때" },
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]["event"]

/**
 * 템플릿 변수 치환. `{{key}}` 형태만 지원한다(의도적으로 단순하게).
 *
 * 값이 없는 변수는 **빈 문자열이 아니라 그대로 남긴다.**
 * "{{order_no}}" 가 문구에 그대로 보이면 운영자가 즉시 알아채지만,
 * 조용히 빈칸이 되면 "주문 이(가) 접수되었습니다" 같은 어색한 문구가 고객에게 나간다.
 */
export function renderTemplate(
  body: string,
  vars: Record<string, unknown>
): { text: string; missing: string[] } {
  const missing: string[] = []
  const text = body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    const v = vars[key]
    if (v === undefined || v === null || v === "") {
      missing.push(key)
      return whole
    }
    return String(v)
  })
  return { text, missing }
}

/** SMS 는 길이 제한이 있다. 초과 시 잘라내되 잘렸다는 사실을 알린다. */
export const SMS_MAX_BYTES = 2000 // LMS 기준(90byte 초과 시 LMS 로 전환)
export function checkLength(channel: string, text: string): { ok: boolean; bytes: number } {
  const bytes = Buffer.byteLength(text, "utf8")
  if (channel !== "sms") return { ok: true, bytes }
  return { ok: bytes <= SMS_MAX_BYTES, bytes }
}

/**
 * 수신처 유효성 — 형식이 틀린 곳으로 보내면 업체 과금만 발생하고 도달하지 않는다.
 */
export function isValidRecipient(channel: string, to: string): boolean {
  if (!to) return false
  if (channel === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)
  // sms / kakao — 국내 휴대폰 번호
  const digits = to.replace(/\D/g, "")
  return /^01[016789]\d{7,8}$/.test(digits)
}

/** 한국 통화 표기 — 템플릿 변수에 넣기 좋은 형태 */
export function formatKrw(amount: unknown): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ""
  return `${Math.round(n).toLocaleString("ko-KR")}원`
}

/**
 * 기본 템플릿 — 최초 1회 시드한다.
 * 문구는 관리자에서 얼마든지 바꿀 수 있으므로 여기서는 **무난하고 짧게** 잡는다.
 * (알림톡을 쓸 경우 카카오 템플릿 심사 문구와 맞춰야 하므로 그때 다시 다듬는다)
 */
export const DEFAULT_TEMPLATES: {
  event: string
  channel: string
  name: string
  title: string | null
  body: string
  variables: string
}[] = [
  {
    event: "order.placed",
    channel: "sms",
    name: "주문 접수 안내",
    title: null,
    body: "[{{shop_name}}] {{customer_name}}님, 주문이 접수되었습니다.\n주문번호: {{order_no}}\n결제금액: {{total}}",
    variables: "shop_name,customer_name,order_no,total",
  },
  {
    event: "order.paid",
    channel: "sms",
    name: "입금 확인 안내",
    title: null,
    body: "[{{shop_name}}] 결제가 확인되었습니다.\n주문번호: {{order_no}}\n결제금액: {{total}}",
    variables: "shop_name,order_no,total",
  },
  {
    event: "order.shipped",
    channel: "sms",
    name: "발송 안내",
    title: null,
    body: "[{{shop_name}}] 주문하신 상품이 발송되었습니다.\n주문번호: {{order_no}}\n택배사: {{carrier}}\n운송장: {{tracking_no}}",
    variables: "shop_name,order_no,carrier,tracking_no",
  },
  {
    event: "order.delivered",
    channel: "sms",
    name: "배송 완료 안내",
    title: null,
    body: "[{{shop_name}}] 배송이 완료되었습니다.\n주문번호: {{order_no}}\n이용해 주셔서 감사합니다.",
    variables: "shop_name,order_no",
  },
  {
    event: "order.canceled",
    channel: "sms",
    name: "주문 취소 안내",
    title: null,
    body: "[{{shop_name}}] 주문이 취소되었습니다.\n주문번호: {{order_no}}\n환불은 결제수단에 따라 영업일 기준 3~5일 소요됩니다.",
    variables: "shop_name,order_no",
  },
  {
    event: "order.refunded",
    channel: "sms",
    name: "환불 완료 안내",
    title: null,
    body: "[{{shop_name}}] 환불이 완료되었습니다.\n주문번호: {{order_no}}\n환불금액: {{refund_amount}}",
    variables: "shop_name,order_no,refund_amount",
  },
  {
    event: "customer.created",
    channel: "sms",
    name: "가입 환영",
    title: null,
    body: "[{{shop_name}}] {{customer_name}}님, 가입을 환영합니다!",
    variables: "shop_name,customer_name",
  },
  {
    event: "point.expiring",
    channel: "sms",
    name: "적립금 소멸 예정 안내",
    title: null,
    body: "[{{shop_name}}] 보유 적립금 {{points}}이(가) {{expire_date}}에 소멸될 예정입니다.",
    variables: "shop_name,points,expire_date",
  },
  {
    event: "restock.available",
    channel: "sms",
    name: "재입고 알림",
    title: null,
    body: "[{{shop_name}}] 기다리시던 '{{product_name}}'이(가) 재입고되었습니다.",
    variables: "shop_name,product_name",
  },
]

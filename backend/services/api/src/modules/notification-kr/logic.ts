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
 * 템플릿 변수 치환.
 *
 * 두 가지 표기를 모두 지원한다:
 *   {{key}}  — 일반 표기
 *   #{key}   — **카카오 알림톡 표준 표기.** 카카오에 등록하는 템플릿은 이 형식을 쓴다.
 * 심사에 올린 문구를 그대로 복사해 넣어도 동작하도록 둘 다 받는다.
 *
 * 값이 없는 변수는 **빈 문자열이 아니라 그대로 남긴다.**
 * "#{order_no}" 가 문구에 그대로 보이면 운영자가 즉시 알아채지만,
 * 조용히 빈칸이 되면 "주문 이(가) 접수되었습니다" 같은 어색한 문구가 고객에게 나간다.
 */
export function renderTemplate(
  body: string,
  vars: Record<string, unknown>
): { text: string; missing: string[] } {
  const missing: string[] = []
  const replace = (whole: string, key: string) => {
    const v = vars[key]
    if (v === undefined || v === null || v === "") {
      missing.push(key)
      return whole
    }
    return String(v)
  }
  const text = body
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, replace)
    .replace(/#\{\s*([\w.]+)\s*\}/g, replace)
  return { text, missing }
}

/**
 * 채널별 길이 제한.
 *  - SMS/LMS : 2,000바이트(90바이트를 넘으면 LMS 로 전환되며 단가가 오른다)
 *  - 알림톡  : 1,000자(카카오 규정). 초과분은 발송 자체가 거부된다.
 * 초과를 미리 잡지 않으면 업체 API 에서 거부당하고 고객은 아무것도 못 받는다.
 */
export const SMS_MAX_BYTES = 2000
export const KAKAO_MAX_CHARS = 1000
export function checkLength(channel: string, text: string): { ok: boolean; bytes: number } {
  const bytes = Buffer.byteLength(text, "utf8")
  if (channel === "kakao") return { ok: text.length <= KAKAO_MAX_CHARS, bytes }
  if (channel === "sms") return { ok: bytes <= SMS_MAX_BYTES, bytes }
  return { ok: true, bytes }
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
 * 알림톡 버튼 파싱 — 잘못된 JSON 이 저장돼 있어도 발송을 막지 않는다.
 * 버튼은 부가 요소다. 그것 때문에 알림 자체가 안 나가면 더 손해다.
 */
export function parseButtons(raw: unknown): { name: string; type: string; url?: string }[] {
  if (!raw || typeof raw !== "string") return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (b): b is { name: string; type: string; url?: string } =>
        !!b && typeof b === "object" && typeof (b as { name?: unknown }).name === "string"
    )
  } catch {
    return []
  }
}

/**
 * 기본 템플릿 — 최초 1회 시드한다.
 *
 * **카카오 알림톡 기준으로 작성했다.** 국내에서 가장 많이 쓰는 채널이고 문자보다 단가가 싸다.
 *
 * 알림톡을 쓸 때 반드시 알아야 할 것 (카카오 규정)
 *  1. **사전 심사** — 아무 문구나 못 보낸다. 카카오에 템플릿을 등록해 승인받아야 하고,
 *     승인된 코드(template_code)를 발송 시 함께 보낸다. 심사에 며칠 걸린다.
 *  2. **변수는 `#{변수}` 표기** — 아래 문구를 그대로 카카오에 등록하면 된다.
 *  3. **정보성만 가능** — 광고·홍보 문구를 넣으면 반려된다(할인 안내 등은 별도 채널로).
 *  4. **1,000자 제한**
 *  5. **대체발송(문자)** — 카카오톡 미설치·차단 시 알림톡은 실패한다.
 *     그때 문자로 대신 보내는 것이 국내 실무 표준이라 짧게 줄인 fallback_body 를 함께 둔다.
 *
 * 문구는 관리자에서 얼마든지 바꿀 수 있다. 다만 **알림톡 본문을 바꾸면 재심사가 필요하다.**
 * (문자 대체발송 문구는 심사 대상이 아니라 자유롭게 수정 가능)
 */
export const DEFAULT_TEMPLATES: {
  event: string
  channel: string
  name: string
  title: string | null
  body: string
  variables: string
  template_code: string | null
  buttons: string | null
  fallback_body: string | null
}[] = [
  {
    event: "order.placed",
    channel: "kakao",
    name: "주문 접수 안내",
    title: "주문이 접수되었습니다",
    body: [
      "[#{shop_name}]",
      "#{customer_name}님, 주문이 정상 접수되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "· 결제금액: #{total}",
      "",
      "주문 내역은 아래 버튼에서 확인하실 수 있습니다.",
    ].join("\n"),
    variables: "shop_name,customer_name,order_no,total,order_url",
    template_code: null,
    buttons: '[{"name":"주문 상세보기","type":"WL","url":"#{order_url}"}]',
    fallback_body: [
      "[#{shop_name}] 주문이 접수되었습니다.",
      "주문번호: #{order_no}",
      "결제금액: #{total}",
    ].join("\n"),
  },
  {
    event: "order.paid",
    channel: "kakao",
    name: "입금 확인 안내",
    title: "결제가 확인되었습니다",
    body: [
      "[#{shop_name}]",
      "결제가 정상적으로 확인되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "· 결제금액: #{total}",
      "",
      "상품 준비가 완료되면 발송 안내를 보내드립니다.",
    ].join("\n"),
    variables: "shop_name,order_no,total,order_url",
    template_code: null,
    buttons: '[{"name":"주문 상세보기","type":"WL","url":"#{order_url}"}]',
    fallback_body: [
      "[#{shop_name}] 결제가 확인되었습니다.",
      "주문번호: #{order_no}",
      "결제금액: #{total}",
    ].join("\n"),
  },
  {
    event: "order.shipped",
    channel: "kakao",
    name: "발송 안내",
    title: "상품이 발송되었습니다",
    body: [
      "[#{shop_name}]",
      "주문하신 상품이 발송되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "· 택배사: #{carrier}",
      "· 운송장번호: #{tracking_no}",
      "",
      "배송 조회는 아래 버튼을 눌러주세요.",
    ].join("\n"),
    variables: "shop_name,order_no,carrier,tracking_no",
    template_code: null,
    // DS(배송조회) 버튼 — 카카오가 택배사·운송장을 인식해 조회 화면을 띄운다.
    buttons: '[{"name":"배송조회","type":"DS"}]',
    fallback_body: [
      "[#{shop_name}] 상품이 발송되었습니다.",
      "#{carrier} #{tracking_no}",
      "주문번호: #{order_no}",
    ].join("\n"),
  },
  {
    event: "order.delivered",
    channel: "kakao",
    name: "배송 완료 안내",
    title: "배송이 완료되었습니다",
    body: [
      "[#{shop_name}]",
      "주문하신 상품의 배송이 완료되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "",
      "상품에 문제가 있으시면 고객센터로 연락 주세요.",
      "이용해 주셔서 감사합니다.",
    ].join("\n"),
    variables: "shop_name,order_no,order_url",
    template_code: null,
    buttons: '[{"name":"주문 상세보기","type":"WL","url":"#{order_url}"}]',
    fallback_body: ["[#{shop_name}] 배송이 완료되었습니다.", "주문번호: #{order_no}"].join("\n"),
  },
  {
    event: "order.canceled",
    channel: "kakao",
    name: "주문 취소 안내",
    title: "주문이 취소되었습니다",
    body: [
      "[#{shop_name}]",
      "주문이 취소되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "",
      "환불은 결제수단에 따라 영업일 기준 3~5일 소요될 수 있습니다.",
    ].join("\n"),
    variables: "shop_name,order_no",
    template_code: null,
    buttons: null,
    fallback_body: ["[#{shop_name}] 주문이 취소되었습니다.", "주문번호: #{order_no}"].join("\n"),
  },
  {
    event: "order.refunded",
    channel: "kakao",
    name: "환불 완료 안내",
    title: "환불이 완료되었습니다",
    body: [
      "[#{shop_name}]",
      "환불 처리가 완료되었습니다.",
      "",
      "· 주문번호: #{order_no}",
      "· 환불금액: #{refund_amount}",
      "",
      "결제수단에 따라 실제 반영까지 영업일 기준 3~5일 소요될 수 있습니다.",
    ].join("\n"),
    variables: "shop_name,order_no,refund_amount",
    template_code: null,
    buttons: null,
    fallback_body: ["[#{shop_name}] 환불이 완료되었습니다.", "환불금액: #{refund_amount}"].join(
      "\n"
    ),
  },
  {
    event: "customer.created",
    channel: "kakao",
    name: "가입 환영",
    title: "가입을 환영합니다",
    body: [
      "[#{shop_name}]",
      "#{customer_name}님, 회원가입이 완료되었습니다.",
      "",
      "앞으로 주문·배송 안내를 이 채널로 보내드립니다.",
    ].join("\n"),
    variables: "shop_name,customer_name",
    template_code: null,
    buttons: null,
    fallback_body: "[#{shop_name}] #{customer_name}님, 가입이 완료되었습니다.",
  },
  {
    event: "point.expiring",
    channel: "kakao",
    name: "적립금 소멸 예정 안내",
    title: "적립금 소멸 예정 안내",
    body: [
      "[#{shop_name}]",
      "보유하신 적립금이 곧 소멸될 예정입니다.",
      "",
      "· 소멸 예정 적립금: #{points}",
      "· 소멸 예정일: #{expire_date}",
      "",
      "소멸 전에 사용해 주세요.",
    ].join("\n"),
    variables: "shop_name,points,expire_date",
    template_code: null,
    buttons: null,
    fallback_body: "[#{shop_name}] 적립금 #{points}이(가) #{expire_date}에 소멸됩니다.",
  },
  {
    event: "restock.available",
    channel: "kakao",
    name: "재입고 알림",
    title: "재입고 알림",
    body: [
      "[#{shop_name}]",
      "신청하신 상품이 재입고되었습니다.",
      "",
      "· 상품명: #{product_name}",
      "",
      "수량이 한정되어 있을 수 있습니다.",
    ].join("\n"),
    variables: "shop_name,product_name,product_url",
    template_code: null,
    buttons: '[{"name":"상품 보러가기","type":"WL","url":"#{product_url}"}]',
    fallback_body: "[#{shop_name}] '#{product_name}'이(가) 재입고되었습니다.",
  },
]


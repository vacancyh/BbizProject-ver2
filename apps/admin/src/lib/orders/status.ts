/**
 * 주문 상태 한글 라벨 + 배지 톤 매핑 (Medusa status → 한국 운영 UX).
 * prototype 주문 화면의 상태 표기 규약을 따른다.
 */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

type Label = { label: string; tone: BadgeTone };

const ORDER_STATUS: Record<string, Label> = {
  pending: { label: "진행 중", tone: "info" },
  completed: { label: "완료", tone: "success" },
  archived: { label: "보관", tone: "neutral" },
  canceled: { label: "취소", tone: "danger" },
  requires_action: { label: "확인 필요", tone: "warning" },
  draft: { label: "임시", tone: "neutral" },
};

const PAYMENT_STATUS: Record<string, Label> = {
  not_paid: { label: "미결제", tone: "neutral" },
  awaiting: { label: "입금 대기", tone: "warning" },
  authorized: { label: "결제 승인", tone: "info" },
  partially_authorized: { label: "부분 승인", tone: "warning" },
  captured: { label: "결제 완료", tone: "success" },
  partially_captured: { label: "부분 결제", tone: "warning" },
  refunded: { label: "환불 완료", tone: "danger" },
  partially_refunded: { label: "부분 환불", tone: "warning" },
  canceled: { label: "결제 취소", tone: "danger" },
  requires_action: { label: "확인 필요", tone: "warning" },
};

const FULFILLMENT_STATUS: Record<string, Label> = {
  not_fulfilled: { label: "미출고", tone: "neutral" },
  partially_fulfilled: { label: "부분 출고", tone: "warning" },
  fulfilled: { label: "출고 완료", tone: "info" },
  partially_shipped: { label: "부분 배송", tone: "warning" },
  shipped: { label: "배송 중", tone: "info" },
  partially_delivered: { label: "부분 배송완료", tone: "warning" },
  delivered: { label: "배송 완료", tone: "success" },
  canceled: { label: "출고 취소", tone: "danger" },
};

function pick(map: Record<string, Label>, key: string): Label {
  return map[key] ?? { label: key, tone: "neutral" };
}

export const orderStatusLabel = (s: string) => pick(ORDER_STATUS, s);
export const paymentStatusLabel = (s: string) => pick(PAYMENT_STATUS, s);
export const fulfillmentStatusLabel = (s: string) => pick(FULFILLMENT_STATUS, s);

/** 전화번호 마스킹(010-****-1234). */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  return phone.replace(/(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/, "$1-****-$3");
}

/** 이메일 마스킹(ab****@domain). */
export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  return email.replace(/^([A-Za-z0-9._%+-]{1,2})[^@]*(@.*)$/, "$1****$2");
}

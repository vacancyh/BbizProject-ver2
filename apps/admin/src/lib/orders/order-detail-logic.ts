/**
 * 주문 상세 순수 로직 모듈 (t002_주문상세 spec §5, §6)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/orders/page.tsx 의 상세 드로어가
 *   orderItemSubtotal / sortStateHistory 를 실제 호출.
 */

import type { OrderDetail } from "@/lib/api/orders";

/** StateHistory 이벤트 (BE /admin/orders/:id/history 응답 단일 아이템) */
export type StateEvent = {
  id: string;
  /** 전이 전 상태 */
  from_state: string | null;
  /** 전이 후 상태 */
  to_state: string;
  /** 전이 발생 시각 (ISO) */
  created_at: string;
  /** 메모/사유 (옵션) */
  note?: string | null;
};

/** 정렬 + 표기 문자열이 파생된 이벤트 */
export type StateEventDisplay = StateEvent & {
  /** 화면 표기용: "→" 포함 전이 문자열 (예: "pending → completed") */
  transitionLabel: string;
};

/**
 * StateHistory 이벤트 정렬 순수함수 (spec §5 A2, UT-002)
 *
 * - created_at 오름차순 정렬 (가장 오래된 이벤트가 맨 위)
 * - 각 이벤트에 from→to 표기 문자열(transitionLabel) 파생
 *
 * @param events  StateEvent 배열 (순서 무관)
 * @returns 정렬된 StateEventDisplay 배열
 */
export function sortStateHistory(events: StateEvent[]): StateEventDisplay[] {
  return [...events]
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return ta - tb;
    })
    .map((e) => ({
      ...e,
      transitionLabel: e.from_state
        ? `${e.from_state} → ${e.to_state}`
        : e.to_state,
    }));
}

/**
 * 주문 상품 합계 파생 순수함수 (spec §3 S1, UT-001)
 *
 * Medusa subtotal 은 배송비를 포함하므로
 * 상품만의 합계 표시에는 아래 우선순위로 산출한다:
 *   1. detail.item_subtotal (BE 필드가 있으면 직접 사용)
 *   2. detail.subtotal - detail.shipping_total (배송비 차감)
 *   3. detail.total (최후 fallback)
 *
 * @param detail  OrderDetail
 * @returns 상품 합계 금액(number)
 */
export function orderItemSubtotal(detail: Pick<OrderDetail, "item_subtotal" | "subtotal" | "shipping_total" | "total">): number {
  if (detail.item_subtotal != null) {
    return detail.item_subtotal;
  }
  if (detail.subtotal != null) {
    return detail.subtotal - (detail.shipping_total ?? 0);
  }
  return detail.total;
}

/**
 * 반품 접수 순수 로직 모듈 (t004_반품접수 spec §4, §5)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/orders/page.tsx 가
 *   calcReturnableItems / isDuplicateReturnLine /
 *   resolveShippingFeePayer 를 실제 호출.
 */

import type { OrderLineItem } from "@/lib/api/orders";
import type { RmaReturnReason } from "@/lib/api/orders";

/** 반품 가능 라인 아이템 */
export type ReturnableItem = {
  id: string;
  /** 반품 가능 최대 수량 (≤ 배송완료 수량) */
  maxQuantity: number;
  product_title: string;
  variant_title?: string | null;
};

/** 이미 반품 중인 라인 정보 */
export type ActiveReturnLine = {
  /** OrderLineItem id */
  item_id: string;
  /** 진행 중인 반품 수량 */
  quantity: number;
};

/**
 * 반품 가능 라인/수량 산출 순수함수 (spec §4 I1, UT-001)
 *
 * - 배송완료(delivered) 수량을 기준으로 반품 가능 수량 산출.
 * - 현재 구현: 주문 라인아이템 전체 = 배송완료 수량으로 간주.
 * - activeReturnLines 에 이미 반품 중인 수량이 있으면 그만큼 차감.
 *
 * @param items  배송완료 주문의 라인아이템
 * @param activeReturnLines  현재 진행 중인 반품 라인들 (중복 차감용)
 * @returns 반품 가능 아이템 배열
 */
export function calcReturnableItems(
  items: OrderLineItem[],
  activeReturnLines: ActiveReturnLine[] = []
): ReturnableItem[] {
  return items
    .map((it) => {
      const activeQty = activeReturnLines
        .filter((r) => r.item_id === it.id)
        .reduce((s, r) => s + r.quantity, 0);
      const maxQuantity = Math.max(0, it.quantity - activeQty);
      return {
        id: it.id,
        maxQuantity,
        product_title: it.product_title,
        variant_title: it.variant_title,
      };
    })
    .filter((it) => it.maxQuantity > 0);
}

/**
 * 동일 라인 반품 중복 클라이언트 가드 순수함수 (spec §4 I1, §8 C1, UT-003)
 *
 * - 요청하는 반품 items 중 이미 activeReturnLines 에 있는 item_id 가 있으면 true.
 * - 서버 409 UNIQUE 제약 전 클라이언트 사전 차단용.
 *
 * @param requestItems  반품 요청 대상 item id 배열
 * @param activeReturnLines  현재 진행 중인 반품 라인들
 * @returns 중복 라인이 있으면 true
 */
export function isDuplicateReturnLine(
  requestItems: string[],
  activeReturnLines: ActiveReturnLine[]
): boolean {
  const activeIds = new Set(activeReturnLines.map((r) => r.item_id));
  return requestItems.some((id) => activeIds.has(id));
}

/**
 * 배송비 부담 주체 자동 판정 순수함수 (spec §4 I3, 전자상거래법 §17 ②, UT-001)
 *
 * 사유 기반 규칙:
 * - CUSTOMER_CHANGE_OF_MIND → customer (소비자 귀책)
 * - PRODUCT_DEFECT          → seller   (사업자 귀책)
 * - WRONG_DELIVERY          → seller   (사업자 귀책)
 * - OTHER                   → customer (기본 소비자 부담)
 *
 * @param reason  반품 사유 코드
 * @returns "customer" | "seller"
 */
export function resolveShippingFeePayer(
  reason: RmaReturnReason
): "customer" | "seller" {
  switch (reason) {
    case "PRODUCT_DEFECT":
    case "WRONG_DELIVERY":
      return "seller";
    case "CUSTOMER_CHANGE_OF_MIND":
    case "OTHER":
    default:
      return "customer";
  }
}

/**
 * 반품 접수 가능 여부 판정 (spec §3 S1)
 * - 주문 상태가 delivered 이후(fulfillment_status === "delivered") 인 경우 true.
 */
export function canRequestReturn(
  fulfillmentStatus: string,
  orderStatus: string
): boolean {
  return fulfillmentStatus === "delivered" && orderStatus !== "canceled";
}

/**
 * 반품 수령 처리(receiveReturn) 가능 여부 판정 (spec §3 S3, UT-002)
 * - 반품 status 가 "requested" 인 경우 수령 처리 가능.
 */
export function canReceiveReturn(returnStatus: string): boolean {
  return returnStatus === "requested" || returnStatus === "partially_received";
}

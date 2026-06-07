/**
 * 주문 목록 순수 로직 모듈 (t001_주문목록조회 spec §4, §5)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/lib/api/orders.ts 의 listOrders 가 buildOrderListQuery 를 호출.
 *   apps/admin/src/app/(admin)/orders/page.tsx 의 export 버튼이 ordersToCsv 를 호출.
 */

import type { OrderListItem } from "@/lib/api/orders";

/** 허용된 status enum 화이트리스트 (Medusa 표준값) */
export const ALLOWED_ORDER_STATUSES = [
  "pending",
  "completed",
  "canceled",
  "archived",
  "requires_action",
  "draft",
] as const;

export type AllowedOrderStatus = (typeof ALLOWED_ORDER_STATUSES)[number];

/** 목록 조회 파라미터 (필터 포함) */
export type OrderListFilters = {
  /** 키워드 검색 (주문번호/이메일/수령인 부분일치) */
  q?: string;
  /** 주문 상태 필터 — 화이트리스트 외 값은 무시됨 */
  status?: string;
  /** 기간 시작 (ISO 날짜 문자열, YYYY-MM-DD 또는 ISO) */
  from?: string;
  /** 기간 종료 (ISO 날짜 문자열, YYYY-MM-DD 또는 ISO) */
  to?: string;
  /** 페이지 크기 (기본값: 20) */
  limit?: number;
  /** 오프셋 (기본값: 0) */
  offset?: number;
};

/**
 * 주문 목록 쿼리 객체 생성 순수함수 (spec §4 I1/I2/I3)
 *
 * - status 화이트리스트 검증: 허용 외 값은 쿼리에 포함하지 않음
 * - 기간 from > to 이면 Error("기간 범위 오류") throw
 * - created_at[$gte]/$lte ISO 매핑
 * - q passthrough
 *
 * @returns Medusa /admin/orders 에 전달할 쿼리 파라미터 레코드
 */
export function buildOrderListQuery(
  filters: OrderListFilters = {}
): Record<string, string> {
  const params: Record<string, string> = {};

  // 키워드 passthrough
  if (filters.q) {
    params["q"] = filters.q;
  }

  // status 화이트리스트 검증 (허용 외 값 무시)
  if (filters.status) {
    const normalized = filters.status as string;
    if ((ALLOWED_ORDER_STATUSES as readonly string[]).includes(normalized)) {
      params["status[]"] = normalized;
    }
    // 화이트리스트 외 값은 조용히 무시 (스펙: "그 외 무시")
  }

  // 기간 검증 및 created_at 매핑
  if (filters.from || filters.to) {
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;

    // from > to 이면 오류 throw (spec §4 I1)
    if (fromDate && toDate && fromDate > toDate) {
      throw new Error("기간 범위 오류");
    }

    if (fromDate && !isNaN(fromDate.getTime())) {
      params["created_at[$gte]"] = fromDate.toISOString();
    }
    if (toDate && !isNaN(toDate.getTime())) {
      // to 는 해당 날짜 끝(23:59:59.999)까지 포함하기 위해 다음날 00:00:00 미만으로 처리
      const toEnd = new Date(toDate);
      toEnd.setHours(23, 59, 59, 999);
      params["created_at[$lte]"] = toEnd.toISOString();
    }
  }

  // 페이지네이션
  params["limit"] = String(filters.limit ?? 20);
  params["offset"] = String(filters.offset ?? 0);

  return params;
}

/** CSV 한글 헤더 */
const CSV_HEADERS = [
  "주문번호",
  "주문일시",
  "고객명",
  "수량",
  "결제금액",
  "결제상태",
  "주문상태",
  "배송상태",
] as const;

/**
 * CSV 셀 이스케이프 — 콤마/쌍따옴표/개행 포함 시 쌍따옴표로 감싸고 내부 " 는 "" 로 치환.
 */
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 주문 목록 → CSV 문자열 변환 순수함수 (spec §5 A2, UT-003)
 *
 * - UTF-8 BOM(﻿) 포함 (엑셀 한글 깨짐 방지)
 * - 한글 헤더: 주문번호,주문일시,고객명,수량,결제금액,결제상태,주문상태,배송상태
 * - 콤마·쌍따옴표 이스케이프 적용
 *
 * @param orders  OrderListItem 배열
 * @returns UTF-8 BOM + CSV 문자열
 */
export function ordersToCsv(orders: OrderListItem[]): string {
  const headerRow = CSV_HEADERS.map(escapeCsvCell).join(",");

  const rows = orders.map((o) => {
    const displayId = `#${o.display_id}`;
    const createdAt = o.created_at
      ? new Date(o.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
      : "";
    const customerName =
      [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ").trim() ||
      o.email ||
      "";
    const qty = String((o.items ?? []).reduce((s, i) => s + i.quantity, 0));
    const amount = String(o.total);
    const paymentStatus = o.payment_status;
    const orderStatus = o.status;
    const fulfillmentStatus = o.fulfillment_status;

    return [
      displayId,
      createdAt,
      customerName,
      qty,
      amount,
      paymentStatus,
      orderStatus,
      fulfillmentStatus,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  // UTF-8 BOM + 헤더 + 데이터 행
  return "﻿" + [headerRow, ...rows].join("\n");
}

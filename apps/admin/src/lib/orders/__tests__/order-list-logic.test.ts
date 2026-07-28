/**
 * 단위 테스트 — t001_주문목록조회 (unit_003)
 *
 * production 코드 import: @/lib/orders/order-list-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/lib/api/orders.ts 의 listOrders 가 buildOrderListQuery 를 호출
 *  - apps/admin/src/app/(admin)/orders/page.tsx 의 export 버튼이 ordersToCsv 를 호출
 *
 * UT-001: 주문 목록 로드 + 페이지네이션 — status.ts 라벨/마스킹 + 목록 파라미터 기본값
 * UT-002: 상태/기간 필터 — buildOrderListQuery: status 화이트리스트·from>to throw·created_at 매핑
 * UT-003: CSV export — ordersToCsv: 헤더/이스케이프/BOM
 */

import { describe, it, expect } from "vitest";
import {
  buildOrderListQuery,
  ordersToCsv,
  ALLOWED_ORDER_STATUSES,
} from "../order-list-logic";
import {
  orderStatusLabel,
  paymentStatusLabel,
  fulfillmentStatusLabel,
  maskPhone,
  maskEmail,
} from "../status";
import type { OrderListItem } from "@/lib/api/orders";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

function makeOrderItem(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: "order_01",
    display_id: 1,
    status: "pending",
    payment_status: "captured",
    fulfillment_status: "not_fulfilled",
    total: 50000,
    currency_code: "krw",
    email: "test@example.com",
    created_at: "2024-03-15T09:00:00Z",
    customer: { first_name: "홍", last_name: "길동" },
    items: [{ quantity: 2 }],
    ...overrides,
  };
}

// ─── UT-001: status.ts 라벨/마스킹 + 목록 파라미터 기본값 ─────────────────────

describe("UT-001 주문 목록 로드 + 페이지네이션 (unit_003 #1)", () => {
  describe("status.ts 상태 라벨", () => {
    it("orderStatusLabel: pending → 진행 중 / info", () => {
      const r = orderStatusLabel("pending");
      expect(r.label).toBe("진행 중");
      expect(r.tone).toBe("info");
    });

    it("orderStatusLabel: completed → 완료 / success", () => {
      const r = orderStatusLabel("completed");
      expect(r.label).toBe("완료");
      expect(r.tone).toBe("success");
    });

    it("orderStatusLabel: canceled → 취소 / danger", () => {
      const r = orderStatusLabel("canceled");
      expect(r.label).toBe("취소");
      expect(r.tone).toBe("danger");
    });

    it("orderStatusLabel: 알 수 없는 상태 → key 그대로 / neutral", () => {
      const r = orderStatusLabel("unknown_status");
      expect(r.label).toBe("unknown_status");
      expect(r.tone).toBe("neutral");
    });

    it("paymentStatusLabel: captured → 결제 완료 / success", () => {
      const r = paymentStatusLabel("captured");
      expect(r.label).toBe("결제 완료");
      expect(r.tone).toBe("success");
    });

    it("fulfillmentStatusLabel: not_fulfilled → 미출고 / neutral", () => {
      const r = fulfillmentStatusLabel("not_fulfilled");
      expect(r.label).toBe("미출고");
      expect(r.tone).toBe("neutral");
    });

    it("fulfillmentStatusLabel: delivered → 배송 완료 / success", () => {
      const r = fulfillmentStatusLabel("delivered");
      expect(r.label).toBe("배송 완료");
      expect(r.tone).toBe("success");
    });
  });

  describe("마스킹 함수", () => {
    it("maskPhone: 010-1234-5678 → 010-****-5678", () => {
      expect(maskPhone("010-1234-5678")).toBe("010-****-5678");
    });

    it("maskPhone: null/undefined → —", () => {
      expect(maskPhone(null)).toBe("—");
      expect(maskPhone(undefined)).toBe("—");
    });

    it("maskEmail: test@example.com → te****@example.com", () => {
      expect(maskEmail("test@example.com")).toBe("te****@example.com");
    });

    it("maskEmail: null/undefined → —", () => {
      expect(maskEmail(null)).toBe("—");
      expect(maskEmail(undefined)).toBe("—");
    });
  });

  describe("buildOrderListQuery 기본값", () => {
    it("파라미터 없으면 limit=20, offset=0 기본값", () => {
      const q = buildOrderListQuery({});
      expect(q["limit"]).toBe("20");
      expect(q["offset"]).toBe("0");
    });

    it("limit/offset 명시 시 해당 값 반환", () => {
      const q = buildOrderListQuery({ limit: 10, offset: 30 });
      expect(q["limit"]).toBe("10");
      expect(q["offset"]).toBe("30");
    });

    it("q 미전달 시 쿼리에 포함 안 됨", () => {
      const q = buildOrderListQuery({});
      expect(q["q"]).toBeUndefined();
    });

    it("q 전달 시 passthrough", () => {
      const q = buildOrderListQuery({ q: "홍길동" });
      expect(q["q"]).toBe("홍길동");
    });
  });
});

// ─── UT-002: buildOrderListQuery 상태/기간 필터 ───────────────────────────────

describe("UT-002 상태/기간 필터 (unit_003 #2)", () => {
  describe("status 화이트리스트", () => {
    it("허용 status(pending) → 쿼리에 포함", () => {
      const q = buildOrderListQuery({ status: "pending" });
      expect(q["status[]"]).toBe("pending");
    });

    it.each(ALLOWED_ORDER_STATUSES)("허용 status(%s) → 쿼리에 포함", (s) => {
      const q = buildOrderListQuery({ status: s });
      expect(q["status[]"]).toBe(s);
    });

    it("미허용 status(invalid_status) → 쿼리에서 제외(무시)", () => {
      const q = buildOrderListQuery({ status: "invalid_status" });
      expect(q["status[]"]).toBeUndefined();
    });

    it("빈 status 문자열 → 쿼리에서 제외", () => {
      const q = buildOrderListQuery({ status: "" });
      expect(q["status[]"]).toBeUndefined();
    });
  });

  describe("기간 검증", () => {
    it("from > to 이면 Error('기간 범위 오류') throw", () => {
      expect(() =>
        buildOrderListQuery({ from: "2024-03-20", to: "2024-03-10" })
      ).toThrow("기간 범위 오류");
    });

    it("from = to 이면 오류 없음", () => {
      expect(() =>
        buildOrderListQuery({ from: "2024-03-15", to: "2024-03-15" })
      ).not.toThrow();
    });

    it("from < to 이면 오류 없음", () => {
      expect(() =>
        buildOrderListQuery({ from: "2024-03-01", to: "2024-03-31" })
      ).not.toThrow();
    });
  });

  describe("created_at ISO 매핑", () => {
    it("from 전달 시 created_at[$gte] 포함 (ISO 형식)", () => {
      const q = buildOrderListQuery({ from: "2024-03-01" });
      expect(q["created_at[$gte]"]).toContain("2024-03-01");
    });

    it("to 전달 시 created_at[$lte] 포함 (ISO 형식)", () => {
      const q = buildOrderListQuery({ to: "2024-03-31" });
      expect(q["created_at[$lte]"]).toContain("2024-03-31");
    });

    it("from만 전달 시 created_at[$lte] 없음", () => {
      const q = buildOrderListQuery({ from: "2024-03-01" });
      expect(q["created_at[$lte]"]).toBeUndefined();
    });

    it("to만 전달 시 created_at[$gte] 없음", () => {
      const q = buildOrderListQuery({ to: "2024-03-31" });
      expect(q["created_at[$gte]"]).toBeUndefined();
    });

    it("status + 기간 복합 필터 — 모두 쿼리에 포함", () => {
      const q = buildOrderListQuery({
        status: "completed",
        from: "2024-01-01",
        to: "2024-03-31",
      });
      expect(q["status[]"]).toBe("completed");
      expect(q["created_at[$gte]"]).toBeDefined();
      expect(q["created_at[$lte]"]).toBeDefined();
    });
  });
});

// ─── UT-003: CSV export ───────────────────────────────────────────────────────

describe("UT-003 CSV export (unit_003 #3)", () => {
  const sampleOrders: OrderListItem[] = [
    makeOrderItem({ display_id: 1, total: 50000 }),
    makeOrderItem({
      id: "order_02",
      display_id: 2,
      total: 30000,
      email: "another@example.com",
      customer: { first_name: "김", last_name: "철수" },
      items: [{ quantity: 1 }],
      payment_status: "not_paid",
      fulfillment_status: "fulfilled",
      status: "completed",
    }),
  ];

  it("UTF-8 BOM(\\uFEFF) 으로 시작", () => {
    const csv = ordersToCsv(sampleOrders);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("첫 줄이 한글 헤더 8개 컬럼", () => {
    const csv = ordersToCsv(sampleOrders);
    const lines = csv.slice(1).split("\n"); // BOM 제거 후 분리
    expect(lines[0]).toBe(
      "주문번호,주문일시,고객명,수량,결제금액,결제상태,주문상태,배송상태"
    );
  });

  it("데이터 행 수 = orders.length", () => {
    const csv = ordersToCsv(sampleOrders);
    const lines = csv.slice(1).split("\n");
    // 헤더 1행 + 데이터 2행 = 3줄
    expect(lines.length).toBe(3);
  });

  it("빈 배열 → 헤더만 포함 (데이터 행 없음)", () => {
    const csv = ordersToCsv([]);
    const lines = csv.slice(1).split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("주문번호");
  });

  it("콤마 포함 값 → 쌍따옴표로 이스케이프", () => {
    const orders: OrderListItem[] = [
      makeOrderItem({
        customer: { first_name: "홍,길", last_name: "동" },
      }),
    ];
    const csv = ordersToCsv(orders);
    // 고객명 컬럼에 콤마 포함 → 쌍따옴표 감쌈
    expect(csv).toContain('"홍,길 동"');
  });

  it("쌍따옴표 포함 값 → 내부 따옴표 이스케이프(\"\")", () => {
    const orders: OrderListItem[] = [
      makeOrderItem({
        customer: { first_name: '홍"길', last_name: "동" },
      }),
    ];
    const csv = ordersToCsv(orders);
    expect(csv).toContain('"홍""길 동"');
  });

  it("주문번호 컬럼 = #display_id 형식", () => {
    const csv = ordersToCsv([makeOrderItem({ display_id: 42 })]);
    expect(csv).toContain("#42");
  });

  it("items.quantity 합산 수량 정확 (2건 합산)", () => {
    const orders: OrderListItem[] = [
      makeOrderItem({ items: [{ quantity: 3 }, { quantity: 5 }] }),
    ];
    const csv = ordersToCsv(orders);
    const lines = csv.slice(1).split("\n");
    const cells = lines[1].split(",");
    // 수량은 4번째 컬럼(index 3)
    expect(cells[3]).toBe("8");
  });
});

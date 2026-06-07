/**
 * 단위 테스트 — t006_클레임 (unit_008)
 *
 * production 코드 import: @/lib/orders/claim-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/app/(admin)/orders/page.tsx 가
 *    canRequestClaim / validateClaimInput / resolveClaimOutcome 을 실제 호출
 *
 * UT-001: replace 클레임 — canRequestClaim, validateClaimInput(replace), resolveClaimOutcome
 * UT-002: refund 클레임  — validateClaimInput(refund), resolveClaimOutcome
 * + C1 케이스: 증빙 없는 불량 보류 (§8 C1)
 */

import { describe, it, expect } from "vitest";
import {
  canRequestClaim,
  validateClaimInput,
  resolveClaimOutcome,
  type ClaimInput,
} from "../claim-logic";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

function makeClaimInput(overrides: Partial<ClaimInput> = {}): ClaimInput {
  return {
    type: "replace",
    items: [{ id: "item_01", quantity: 1 }],
    evidence: "defect_photo.jpg",
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UT-001: replace 클레임 (unit_008 #1)
// 기대: Claim(replace) + 대체 발송 안내
// ════════════════════════════════════════════════════════════════════════════

describe("UT-001 replace 클레임 (unit_008 #1)", () => {
  describe("canRequestClaim — 클레임 접수 가능 여부", () => {
    it("delivered + 취소 아님 → true (클레임 가능 상태)", () => {
      expect(canRequestClaim("delivered", "completed")).toBe(true);
    });

    it("not_fulfilled → false (배송 미완료)", () => {
      expect(canRequestClaim("not_fulfilled", "pending")).toBe(false);
    });

    it("delivered + canceled → false (취소된 주문)", () => {
      expect(canRequestClaim("delivered", "canceled")).toBe(false);
    });

    it("fulfilled(발송 중) → false", () => {
      expect(canRequestClaim("fulfilled", "pending")).toBe(false);
    });

    it("shipped → false (아직 배송 미완료)", () => {
      expect(canRequestClaim("shipped", "pending")).toBe(false);
    });
  });

  describe("validateClaimInput — replace 유효성 검증", () => {
    it("정상 replace 입력 → valid: true", () => {
      const result = validateClaimInput(makeClaimInput({ type: "replace" }));
      expect(result.valid).toBe(true);
    });

    it("증빙 있는 replace + 다중 라인 → valid: true", () => {
      const result = validateClaimInput(
        makeClaimInput({
          type: "replace",
          items: [
            { id: "item_01", quantity: 1 },
            { id: "item_02", quantity: 2 },
          ],
          evidence: "photo.jpg",
        })
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("resolveClaimOutcome — replace 후속 안내", () => {
    it("replace → action: replace_dispatch + 재고 확인 안내", () => {
      const outcome = resolveClaimOutcome("replace");
      expect(outcome.action).toBe("replace_dispatch");
      expect(outcome.message).toContain("재고 확인");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-002: refund 클레임 (unit_008 #2)
// 기대: Claim(refund) + 환불 연동 안내
// ════════════════════════════════════════════════════════════════════════════

describe("UT-002 refund 클레임 (unit_008 #2)", () => {
  describe("validateClaimInput — refund 유효성 검증", () => {
    it("정상 refund 입력 → valid: true", () => {
      const result = validateClaimInput(makeClaimInput({ type: "refund" }));
      expect(result.valid).toBe(true);
    });

    it("유형 없음 → valid: false (유형 필수)", () => {
      const result = validateClaimInput(makeClaimInput({ type: "" }));
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("유형 필수");
    });

    it("유형 잘못된 값 → valid: false", () => {
      const result = validateClaimInput(makeClaimInput({ type: "unknown_type" }));
      expect(result.valid).toBe(false);
    });

    it("라인 없음 → valid: false (대상 라인 필수)", () => {
      const result = validateClaimInput(makeClaimInput({ type: "refund", items: [] }));
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("1개 이상");
    });

    it("수량 0인 라인 포함 → valid: false", () => {
      const result = validateClaimInput(
        makeClaimInput({ type: "refund", items: [{ id: "item_01", quantity: 0 }] })
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("수량");
    });
  });

  describe("resolveClaimOutcome — refund 후속 안내", () => {
    it("refund → action: refund_link + t007 환불 연동 안내", () => {
      const outcome = resolveClaimOutcome("refund");
      expect(outcome.action).toBe("refund_link");
      expect(outcome.message).toContain("환불");
    });

    it("알 수 없는 유형 → action: none", () => {
      const outcome = resolveClaimOutcome("unknown");
      expect(outcome.action).toBe("none");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// C1 케이스: 증빙 없는 불량 보류 (spec §8 C1)
// ════════════════════════════════════════════════════════════════════════════

describe("C1 증빙 없는 불량 보류 (§8 C1)", () => {
  it("증빙 없는 replace 클레임 → valid: false, pending: true (보류)", () => {
    const result = validateClaimInput(
      makeClaimInput({ type: "replace", evidence: undefined })
    );
    expect(result.valid).toBe(false);
    expect(result.pending).toBe(true);
    expect(result.reason).toContain("증빙");
  });

  it("증빙 빈 문자열 → valid: false, pending: true (보류)", () => {
    const result = validateClaimInput(
      makeClaimInput({ type: "refund", evidence: "" })
    );
    expect(result.valid).toBe(false);
    expect(result.pending).toBe(true);
  });

  it("증빙 공백 문자열 → valid: false, pending: true (보류)", () => {
    const result = validateClaimInput(
      makeClaimInput({ type: "refund", evidence: "   " })
    );
    expect(result.valid).toBe(false);
    expect(result.pending).toBe(true);
  });

  it("증빙 null → valid: false, pending: true (보류)", () => {
    const result = validateClaimInput(
      makeClaimInput({ type: "replace", evidence: null })
    );
    expect(result.valid).toBe(false);
    expect(result.pending).toBe(true);
  });
});

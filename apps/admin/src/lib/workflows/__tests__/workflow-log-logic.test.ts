/**
 * 단위 테스트 — t005_워크플로우로그 (unit_062)
 *
 * production 코드 import: @/lib/workflows/workflow-log-logic (복제 없음)
 * 호출처:
 *   - apps/admin/src/app/(admin)/settings/workflow-logs/page.tsx 의
 *     ListPanel(validateStateFilter, listWorkflowExecutions 파라미터 전달),
 *     DetailPanel(extractErrors, maskContextPayload, sortedSteps) 가 실제 호출.
 *
 * UT-001: 실행 목록/상세 + 단계별 입출력 조회 — 단계 입출력·상태 표시 + PII 마스킹
 */

import { describe, it, expect } from "vitest";
import {
  validateStateFilter,
  getTransactionStateLabel,
  getStepStateLabel,
  formatDuration,
  extractErrors,
  maskEmail,
  maskPhone,
  maskContextPayload,
  sortedSteps,
  VALID_STATES,
} from "../workflow-log-logic";
import type { WorkflowExecution, WorkflowExecutionStep } from "../../api/workflows";

// ─── UT-001: 실행 목록/상세 + 단계별 입출력 조회 + PII 마스킹 ───────────────

describe("UT-001 워크플로우 로그 — 실행 목록/상세 + 단계별 입출력 조회 + PII 마스킹 (unit_062)", () => {

  // ── I1: 상태 필터 검증 (spec §4 I1) ──────────────────────────────────────

  describe("I1: 상태 필터 검증 (spec §4 — done/failed/idle 등 허용)", () => {
    it("빈 값 → 유효(전체 조회)", () => {
      expect(validateStateFilter("")).toEqual({ valid: true });
      expect(validateStateFilter(undefined)).toEqual({ valid: true });
    });

    it("유효한 상태(done) → 통과", () => {
      expect(validateStateFilter("done")).toEqual({ valid: true });
    });

    it("유효한 상태(failed) → 통과", () => {
      expect(validateStateFilter("failed")).toEqual({ valid: true });
    });

    it("유효한 상태(invoking) → 통과", () => {
      expect(validateStateFilter("invoking")).toEqual({ valid: true });
    });

    it("VALID_STATES 전체 통과", () => {
      for (const s of VALID_STATES) {
        const result = validateStateFilter(s);
        expect(result.valid, `state=${s} 통과해야 함`).toBe(true);
      }
    });

    it("유효하지 않은 상태 → 오류", () => {
      const result = validateStateFilter("unknown_state");
      expect(result.valid).toBe(false);
      expect(result.message).toBe("상태 오류");
    });
  });

  // ── 트랜잭션 상태 표시 ─────────────────────────────────────────────────────

  describe("트랜잭션 상태 → 한글 라벨 + 톤 (spec §3 S1 표시 요소)", () => {
    it("done → 완료/success", () => {
      const { label, tone } = getTransactionStateLabel("done");
      expect(label).toBe("완료");
      expect(tone).toBe("success");
    });

    it("failed → 실패/danger", () => {
      const { label, tone } = getTransactionStateLabel("failed");
      expect(label).toBe("실패");
      expect(tone).toBe("danger");
    });

    it("invoking → 실행 중/info", () => {
      const { label, tone } = getTransactionStateLabel("invoking");
      expect(label).toBe("실행 중");
      expect(tone).toBe("info");
    });

    it("reverted → 롤백됨/warning", () => {
      const { label, tone } = getTransactionStateLabel("reverted");
      expect(label).toBe("롤백됨");
      expect(tone).toBe("warning");
    });

    it("알 수 없는 상태 → 원본값/neutral 폴백", () => {
      const { tone } = getTransactionStateLabel("unknown_xyz" as never);
      expect(tone).toBe("neutral");
    });
  });

  // ── 단계 상태 표시 ─────────────────────────────────────────────────────────

  describe("단계 상태 → 한글 라벨 + 톤 (spec §3 S2 단계별 입출력·상태)", () => {
    it("done → 완료/success", () => {
      const { label, tone } = getStepStateLabel("done");
      expect(label).toBe("완료");
      expect(tone).toBe("success");
    });

    it("failed → 실패/danger", () => {
      const { label, tone } = getStepStateLabel("failed");
      expect(label).toBe("실패");
      expect(tone).toBe("danger");
    });

    it("timeout → 시간 초과/danger", () => {
      const { label, tone } = getStepStateLabel("timeout");
      expect(label).toBe("시간 초과");
      expect(tone).toBe("danger");
    });

    it("skipped → 건너뜀/neutral", () => {
      const { tone } = getStepStateLabel("skipped");
      expect(tone).toBe("neutral");
    });
  });

  // ── 소요 시간 계산 ──────────────────────────────────────────────────────────

  describe("소요 시간 계산 — formatDuration", () => {
    it("0ms → 0초", () => {
      expect(formatDuration(1000, 1000)).toBe("0초");
    });

    it("5초", () => {
      expect(formatDuration(0, 5000)).toBe("5초");
    });

    it("1분 30초", () => {
      expect(formatDuration(0, 90000)).toBe("1분 30초");
    });

    it("정확히 2분", () => {
      expect(formatDuration(0, 120000)).toBe("2분");
    });

    it("1시간 15분", () => {
      expect(formatDuration(0, 3600000 + 15 * 60000)).toBe("1시간 15분");
    });

    it("음수 → —", () => {
      expect(formatDuration(1000, 500)).toBe("—");
    });
  });

  // ── 오류 추출 (spec §3 S2 에러·§8 C1 에러 추적) ───────────────────────────

  describe("오류 추출 — extractErrors (spec §3 S2 에러 표시)", () => {
    const makeExecution = (errors: unknown[]): WorkflowExecution => ({
      id: "exec_1",
      workflow_id: "order-workflow",
      transaction_id: "tx_1",
      state: "failed",
      execution: { steps: {} },
      context: {
        data: { invoke: {}, payload: {} },
        compensate: {},
        errors: errors as never,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it("오류 없음 → 빈 배열", () => {
      expect(extractErrors(makeExecution([]))).toHaveLength(0);
    });

    it("오류 1건 → action·handlerType·message 추출", () => {
      const errs = extractErrors(
        makeExecution([
          { error: { message: "DB 연결 실패" }, action: "createOrder", handlerType: "invoke" },
        ])
      );
      expect(errs).toHaveLength(1);
      expect(errs[0].action).toBe("createOrder");
      expect(errs[0].handlerType).toBe("invoke");
      expect(errs[0].message).toBe("DB 연결 실패");
    });

    it("error.message 없으면 JSON 직렬화 반환", () => {
      const errs = extractErrors(
        makeExecution([
          { error: { code: 500 }, action: "step1", handlerType: "invoke" },
        ])
      );
      expect(errs[0].message).toContain("500");
    });
  });

  // ── PII 마스킹 (spec §3 S2·§8 C1) ──────────────────────────────────────────

  describe("PII 마스킹 (spec §8 C1 — context 내 PII 마스킹)", () => {
    describe("이메일 마스킹 — maskEmail", () => {
      it("이메일 마스킹(ab****@domain.com)", () => {
        const masked = maskEmail("hello@example.com");
        expect(masked).toMatch(/\*{4}/);
        expect(masked).toContain("@example.com");
      });

      it("짧은 이메일(a@b.com) 마스킹", () => {
        const masked = maskEmail("a@b.com");
        expect(masked).toContain("@b.com");
      });
    });

    describe("전화번호 마스킹 — maskPhone", () => {
      it("010-1234-5678 → 010-****-5678", () => {
        const masked = maskPhone("010-1234-5678");
        expect(masked).toContain("****");
        expect(masked).toContain("5678");
      });
    });

    describe("컨텍스트 페이로드 마스킹 — maskContextPayload (spec §3 S2 PII 마스킹)", () => {
      it("email 필드 마스킹", () => {
        const result = maskContextPayload({ email: "user@test.com", name: "홍길동" }) as Record<string, unknown>;
        expect(String(result.email)).toMatch(/\*{4}/);
        expect(result.name).toBe("홍길동");
      });

      it("phone 필드 마스킹", () => {
        const result = maskContextPayload({ phone: "010-1234-5678" }) as Record<string, unknown>;
        expect(String(result.phone)).toContain("****");
      });

      it("중첩 객체 재귀 마스킹", () => {
        const result = maskContextPayload({
          customer: { email: "nested@test.com", id: "cust_1" },
        }) as Record<string, unknown>;
        const customer = result.customer as Record<string, unknown>;
        expect(String(customer.email)).toMatch(/\*{4}/);
        expect(customer.id).toBe("cust_1");
      });

      it("null/undefined → 원본 반환", () => {
        expect(maskContextPayload(null)).toBeNull();
        expect(maskContextPayload(undefined)).toBeUndefined();
      });

      it("배열 → 원본 반환", () => {
        const arr = [1, 2, 3];
        expect(maskContextPayload(arr)).toEqual(arr);
      });
    });
  });

  // ── 단계 목록 정렬 (spec §3 S2 단계별 입출력) ─────────────────────────────

  describe("단계 목록 정렬 — sortedSteps", () => {
    const makeStep = (id: string, depth: number, startedAt: number): WorkflowExecutionStep => ({
      id,
      invoke: { state: "done", status: "ok" },
      compensate: { state: "not_started", status: "idle" },
      definition: {},
      depth,
      startedAt,
    });

    it("depth 오름차순 정렬", () => {
      const steps = {
        step_c: makeStep("step_c", 2, 100),
        step_a: makeStep("step_a", 0, 100),
        step_b: makeStep("step_b", 1, 100),
      };
      const sorted = sortedSteps(steps);
      expect(sorted[0].stepId).toBe("step_a");
      expect(sorted[1].stepId).toBe("step_b");
      expect(sorted[2].stepId).toBe("step_c");
    });

    it("depth 동일하면 startedAt 오름차순 정렬", () => {
      const steps = {
        step_x: makeStep("step_x", 1, 200),
        step_y: makeStep("step_y", 1, 100),
      };
      const sorted = sortedSteps(steps);
      expect(sorted[0].stepId).toBe("step_y");
      expect(sorted[1].stepId).toBe("step_x");
    });

    it("빈 steps → 빈 배열", () => {
      expect(sortedSteps({})).toHaveLength(0);
    });

    it("stepId 필드가 추가됨", () => {
      const steps = { my_step: makeStep("my_step", 0, 0) };
      const sorted = sortedSteps(steps);
      expect(sorted[0].stepId).toBe("my_step");
    });
  });
});

/**
 * 워크플로우 로그 순수 로직 모듈 (t005_워크플로우로그 spec §4 검증 + 표시 로직).
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *     apps/admin/src/lib/api/workflows.ts → 실 API 호출
 *     apps/admin/src/app/(admin)/settings/workflow-logs/page.tsx → 화면에서 이 모듈 사용
 */

import type { TransactionState, TransactionStepState, WorkflowExecution, WorkflowExecutionStep } from "../api/workflows";

// ─── 상태 필터 검증 ────────────────────────────────────────────────────────────

/** 유효한 상태 필터 값 (spec §4 I1). */
export const VALID_STATES: TransactionState[] = [
  "done",
  "failed",
  "not_started",
  "invoking",
  "waiting_to_compensate",
  "compensating",
  "reverted",
];

/**
 * 상태 필터 값 검증 (spec §4 I1).
 * 빈 값은 유효(전체 조회). 유효하지 않은 값은 오류.
 */
export function validateStateFilter(state: string | undefined): { valid: boolean; message?: string } {
  if (!state || state === "") return { valid: true };
  if (VALID_STATES.includes(state as TransactionState)) return { valid: true };
  return { valid: false, message: "상태 오류" };
}

// ─── 상태 표시 ────────────────────────────────────────────────────────────────

/** 트랜잭션 상태 한글 라벨 + 톤. */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StateLabel = { label: string; tone: BadgeTone };

const TRANSACTION_STATE_MAP: Record<TransactionState, StateLabel> = {
  done: { label: "완료", tone: "success" },
  failed: { label: "실패", tone: "danger" },
  not_started: { label: "미시작", tone: "neutral" },
  invoking: { label: "실행 중", tone: "info" },
  waiting_to_compensate: { label: "보상 대기", tone: "warning" },
  compensating: { label: "보상 중", tone: "warning" },
  reverted: { label: "롤백됨", tone: "warning" },
};

/** 트랜잭션 상태 → 한글 라벨 + 톤. */
export function getTransactionStateLabel(state: TransactionState): StateLabel {
  return TRANSACTION_STATE_MAP[state] ?? { label: state, tone: "neutral" };
}

const STEP_STATE_MAP: Record<string, StateLabel> = {
  done: { label: "완료", tone: "success" },
  failed: { label: "실패", tone: "danger" },
  not_started: { label: "미시작", tone: "neutral" },
  invoking: { label: "실행 중", tone: "info" },
  compensating: { label: "보상 중", tone: "warning" },
  reverted: { label: "롤백됨", tone: "warning" },
  dormant: { label: "대기", tone: "neutral" },
  skipped: { label: "건너뜀", tone: "neutral" },
  skipped_failure: { label: "실패 건너뜀", tone: "warning" },
  timeout: { label: "시간 초과", tone: "danger" },
};

/** 단계 상태 → 한글 라벨 + 톤. */
export function getStepStateLabel(state: TransactionStepState | string): StateLabel {
  return STEP_STATE_MAP[state] ?? { label: state, tone: "neutral" };
}

// ─── 소요 시간 계산 ─────────────────────────────────────────────────────────────

/**
 * 두 날짜 사이의 소요 시간을 사람이 읽기 쉬운 형태로 반환.
 * 예: "3초", "1분 23초", "2시간 15분"
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  if (diffMs < 0) return "—";
  const totalSec = Math.floor(diffMs / 1000);
  if (totalSec < 60) return `${totalSec}초`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
  const hour = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hour}시간 ${remMin}분` : `${hour}시간`;
}

/**
 * 단계 소요 시간 계산 (startedAt ms → now 기준, 완료 단계는 step.startedAt ~ updated_at 근사).
 */
export function getStepDuration(step: WorkflowExecutionStep, executionUpdatedAt: string | Date): string {
  if (!step.startedAt) return "—";
  const endMs = step.invoke.state === "done" || step.invoke.state === "failed" || step.invoke.state === "reverted"
    ? new Date(executionUpdatedAt).getTime()
    : Date.now();
  return formatDuration(step.startedAt, endMs);
}

// ─── 오류 추출 ────────────────────────────────────────────────────────────────

/** 실행 오류 목록 추출 (context.errors → 화면 표시용). */
export function extractErrors(execution: WorkflowExecution): Array<{
  action: string;
  handlerType: string;
  message: string;
}> {
  const errs = execution.context?.errors ?? [];
  return errs.map((e) => ({
    action: e.action,
    handlerType: e.handlerType,
    message: typeof e.error?.message === "string"
      ? e.error.message
      : JSON.stringify(e.error ?? {}),
  }));
}

// ─── PII 마스킹 (spec §3 S2·§8 C1) ───────────────────────────────────────────

/**
 * 이메일 마스킹 (ab****@domain.com).
 */
export function maskEmail(email: string): string {
  return email.replace(/^([A-Za-z0-9._%+-]{1,2})[^@]*(@.*)$/, "$1****$2");
}

/**
 * 전화번호 마스킹 (010-****-1234).
 */
export function maskPhone(phone: string): string {
  return phone.replace(/(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/, "$1-****-$3");
}

/**
 * 알려진 PII 필드를 마스킹하여 context payload 를 안전하게 반환.
 * (spec §8 C1 — context 내 PII 마스킹)
 */
export function maskContextPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const obj = payload as Record<string, unknown>;
  const masked: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const lk = key.toLowerCase();
    if (lk === "email" || lk.includes("email")) {
      masked[key] = typeof val === "string" ? maskEmail(val) : val;
    } else if (lk === "phone" || lk.includes("phone") || lk.includes("mobile")) {
      masked[key] = typeof val === "string" ? maskPhone(val) : val;
    } else if (typeof val === "object" && val !== null) {
      masked[key] = maskContextPayload(val);
    } else {
      masked[key] = val;
    }
  }

  return masked;
}

// ─── 단계 목록 정렬 ───────────────────────────────────────────────────────────

/**
 * steps Record → 화면 표시용 배열로 변환 (depth 오름차순 정렬).
 */
export function sortedSteps(steps: Record<string, WorkflowExecutionStep>): (WorkflowExecutionStep & { stepId: string })[] {
  return Object.entries(steps)
    .map(([stepId, step]) => ({ ...step, stepId }))
    .sort((a, b) => a.depth - b.depth || a.startedAt - b.startedAt);
}

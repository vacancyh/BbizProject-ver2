/**
 * 워크플로우 실행(workflow-executions) API 호출 레이어.
 *  - list/detail = Medusa REST /admin/workflows-executions 직접 호출(래핑, 로직 복사 X)
 *  - read-only (쓰기 없음)
 * t005_워크플로우로그 spec §6 API1·API2 정합.
 */
import { apiFetch } from "./client";

// ─── 타입 (Medusa AdminWorkflowExecution 정합) ────────────────────────────────

/** 트랜잭션 상태 (Medusa TransactionState 1:1). */
export type TransactionState =
  | "not_started"
  | "invoking"
  | "waiting_to_compensate"
  | "compensating"
  | "done"
  | "reverted"
  | "failed";

/** 단계 상태 (Medusa TransactionStepState 1:1). */
export type TransactionStepState =
  | "not_started"
  | "invoking"
  | "compensating"
  | "done"
  | "reverted"
  | "failed"
  | "dormant"
  | "skipped"
  | "skipped_failure"
  | "timeout";

/** 단계 상태값 (Medusa TransactionStepStatus 1:1). */
export type TransactionStepStatus =
  | "idle"
  | "ok"
  | "waiting_response"
  | "temp_failure"
  | "permanent_failure";

/** 단계 invoke 결과 (출력). */
export type StepInvokeResult = {
  output: {
    /** 단계 출력(StepResponse 1인자). */
    output: unknown;
    /** 보상 입력(StepResponse 2인자). */
    compensateInput: unknown;
  };
};

/** 단계 오류. */
export type StepError = {
  error: Record<string, unknown>;
  action: string;
  handlerType: string;
};

/** 워크플로우 실행 컨텍스트 (단계 입출력·오류). */
export type WorkflowExecutionContext = {
  data: {
    invoke: Record<string, StepInvokeResult>;
    payload?: unknown;
  };
  compensate: Record<string, unknown>;
  errors: StepError[];
};

/** 단계 함수(invoke/compensate) 상태. */
export type WorkflowExecutionFn = {
  state: TransactionStepState;
  status: TransactionStepStatus;
};

/** 단계 상세. */
export type WorkflowExecutionStep = {
  id: string;
  invoke: WorkflowExecutionFn;
  compensate: WorkflowExecutionFn;
  definition: {
    async?: boolean;
    maxRetries?: number;
    timeout?: number;
    saveResponse?: boolean;
  };
  depth: number;
  startedAt: number;
};

/** 워크플로우 실행 단건. */
export type WorkflowExecution = {
  id: string;
  workflow_id: string;
  transaction_id: string;
  state: TransactionState;
  execution: {
    steps: Record<string, WorkflowExecutionStep>;
  };
  context: WorkflowExecutionContext;
  created_at: string | Date;
  updated_at: string | Date;
  deleted_at?: string | Date | null;
};

/** 목록 조회 파라미터 (spec §4 I1 상태 필터 포함). */
export type WorkflowExecutionListParams = {
  /** 상태 필터(done | failed | idle 등). */
  state?: TransactionState | TransactionState[];
  /** 워크플로우 ID 필터. */
  workflow_id?: string | string[];
  /** 트랜잭션 ID 필터. */
  transaction_id?: string | string[];
  limit?: number;
  offset?: number;
};

// ─── API 호출 함수 ────────────────────────────────────────────────────────────

/**
 * 워크플로우 실행 목록 (Medusa REST GET /admin/workflows-executions).
 * spec §6 API1 정합.
 */
export function listWorkflowExecutions(
  params: WorkflowExecutionListParams = {}
): Promise<{ workflow_executions: WorkflowExecution[]; count: number; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  if (params.state) {
    const states = Array.isArray(params.state) ? params.state : [params.state];
    states.forEach((s) => qs.append("state[]", s));
  }
  if (params.workflow_id) {
    const ids = Array.isArray(params.workflow_id) ? params.workflow_id : [params.workflow_id];
    ids.forEach((id) => qs.append("workflow_id[]", id));
  }
  if (params.transaction_id) {
    const ids = Array.isArray(params.transaction_id) ? params.transaction_id : [params.transaction_id];
    ids.forEach((id) => qs.append("transaction_id[]", id));
  }
  return apiFetch(`/admin/workflows-executions?${qs.toString()}`);
}

/**
 * 워크플로우 실행 상세 (Medusa REST GET /admin/workflows-executions/:id).
 * spec §6 API2 / §5 A2 정합. 단계별 입출력·상태·소요시간·실패 사유 포함.
 */
export function getWorkflowExecution(id: string): Promise<{ workflow_execution: WorkflowExecution }> {
  return apiFetch(`/admin/workflows-executions/${id}`);
}

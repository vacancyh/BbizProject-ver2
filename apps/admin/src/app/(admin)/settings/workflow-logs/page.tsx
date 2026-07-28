"use client";

/**
 * 워크플로우 로그 화면 — t005_워크플로우로그 spec §3 S1·S2 정합.
 * - S1: 실행 목록 (워크플로우명·상태·시작/종료·소요·상태 필터)
 * - S2: 실행 상세 (단계·입력·출력·상태·에러, PII 마스킹)
 * Medusa REST /admin/workflows-executions 직접 호출 (로직 복사 X).
 */

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, RefreshCw, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui";
import {
  listWorkflowExecutions,
  getWorkflowExecution,
  type WorkflowExecution,
  type TransactionState,
  type WorkflowExecutionListParams,
} from "@/lib/api/workflows";
import {
  getTransactionStateLabel,
  getStepStateLabel,
  extractErrors,
  maskContextPayload,
  sortedSteps,
  validateStateFilter,
} from "@/lib/workflows/workflow-log-logic";

// ─── 상수 ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "done", label: "완료" },
  { value: "failed", label: "실패" },
  { value: "invoking", label: "실행 중" },
  { value: "not_started", label: "미시작" },
  { value: "compensating", label: "보상 중" },
  { value: "reverted", label: "롤백됨" },
];

// ─── 날짜 포맷 헬퍼 ────────────────────────────────────────────────────────────

function fmt(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** ms 시각 → Date 문자열. */
function fmtMs(ms: number): string {
  if (!ms) return "—";
  return fmt(new Date(ms));
}

// ─── 뱃지 컴포넌트 ────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: TransactionState | string }) {
  const { label, tone } = getTransactionStateLabel(state as TransactionState);
  return (
    <span className={`badge ${tone}`}>
      <span className="bdot" />
      {label}
    </span>
  );
}

// ─── 단계 행 컴포넌트 ────────────────────────────────────────────────────────

function StepRow({
  step,
  invokeMasked,
}: {
  step: ReturnType<typeof sortedSteps>[number];
  invokeMasked: unknown;
}) {
  const [open, setOpen] = useState(false);
  const invokeLabel = getStepStateLabel(step.invoke.state);
  const hasOutput = invokeMasked !== undefined && invokeMasked !== null;

  return (
    <>
      <tr
        className={`step-row${open ? " open" : ""}`}
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <td style={{ paddingLeft: step.depth * 16 + 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <code style={{ fontSize: 12, background: "var(--surface-2)", borderRadius: 4, padding: "2px 6px" }}>
              {step.stepId}
            </code>
          </span>
        </td>
        <td>
          <span className={`badge ${invokeLabel.tone}`}>
            <span className="bdot" />
            {invokeLabel.label}
          </span>
        </td>
        <td style={{ fontSize: 12, color: "var(--text-3)" }}>
          {fmtMs(step.startedAt)}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={3} style={{ background: "var(--surface-2)", padding: "10px 16px" }}>
            <div style={{ fontSize: 12, display: "grid", gap: 8 }}>
              {hasOutput && (
                <div>
                  <span style={{ fontWeight: 700, color: "var(--text-2)" }}>출력:</span>
                  <pre
                    style={{
                      marginTop: 4,
                      padding: "8px 10px",
                      background: "var(--surface)",
                      borderRadius: 6,
                      overflowX: "auto",
                      maxHeight: 200,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                    }}
                  >
                    {JSON.stringify(invokeMasked, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <span style={{ fontWeight: 700, color: "var(--text-2)" }}>보상 상태:</span>
                <span style={{ marginLeft: 6 }}>
                  <span className={`badge ${getStepStateLabel(step.compensate.state).tone}`}>
                    <span className="bdot" />
                    {getStepStateLabel(step.compensate.state).label}
                  </span>
                </span>
              </div>
              <div style={{ color: "var(--text-3)" }}>
                비동기: {step.definition.async ? "예" : "아니오"}
                {step.definition.maxRetries !== undefined && ` / 최대 재시도: ${step.definition.maxRetries}`}
                {step.definition.timeout !== undefined && ` / 타임아웃: ${step.definition.timeout}s`}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── 상세 패널 컴포넌트 ──────────────────────────────────────────────────────

function DetailPanel({
  executionId,
  onBack,
}: {
  executionId: string;
  onBack: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWorkflowExecution(executionId);
      setDetail(res.workflow_execution);
    } catch (e) {
      toast.show((e as Error)?.message ?? "상세 조회 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [executionId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
          불러오는 중…
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const errors = extractErrors(detail);
  const maskedPayload = maskContextPayload(detail.context?.data?.payload);
  const steps = sortedSteps(detail.execution?.steps ?? {});
  const invokeOutputs = detail.context?.data?.invoke ?? {};

  return (
    <div>
      {/* 뒤로가기 */}
      <button
        type="button"
        className="btn ghost"
        style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}
        onClick={onBack}
      >
        <ChevronLeft size={16} />
        목록으로
      </button>

      {/* 요약 카드 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div className="dsec-t" style={{ marginBottom: 12 }}>실행 요약</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>워크플로우</div>
              <code style={{ fontSize: 12.5, fontWeight: 700 }}>{detail.workflow_id}</code>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>트랜잭션 ID</div>
              <code style={{ fontSize: 11.5, color: "var(--text-2)" }}>{detail.transaction_id}</code>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>상태</div>
              <StateBadge state={detail.state} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>시작</div>
              <span style={{ fontSize: 13 }}>{fmt(detail.created_at)}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>최종 업데이트</div>
              <span style={{ fontSize: 13 }}>{fmt(detail.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 오류 카드 (실패 시) */}
      {errors.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid var(--danger)" }}>
          <div className="card-pad">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertCircle size={16} style={{ color: "var(--danger)" }} />
              <span style={{ fontWeight: 700, color: "var(--danger)", fontSize: 14 }}>실패 사유</span>
            </div>
            {errors.map((err, i) => (
              <div
                key={i}
                style={{ background: "var(--danger-weak)", borderRadius: 8, padding: "10px 12px", marginBottom: 6, fontSize: 12 }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {err.action} ({err.handlerType})
                </div>
                <div style={{ color: "var(--text-2)", fontFamily: "monospace" }}>{err.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 페이로드 카드 (마스킹 적용) */}
      {maskedPayload !== undefined && maskedPayload !== null && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-pad">
            <div className="dsec-t" style={{ marginBottom: 8 }}>입력 페이로드 (PII 마스킹)</div>
            <pre
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                borderRadius: 8,
                overflowX: "auto",
                maxHeight: 240,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(maskedPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 단계별 상세 카드 */}
      <div className="card">
        <div className="card-pad">
          <div className="dsec-t" style={{ marginBottom: 10 }}>단계별 실행 상세</div>
          {steps.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>단계 정보가 없습니다.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--text-2)" }}>단계</th>
                    <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--text-2)" }}>상태</th>
                    <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 600, color: "var(--text-2)" }}>시작</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => {
                    const invokeResult = invokeOutputs[step.stepId];
                    const maskedOutput = maskContextPayload(invokeResult?.output?.output);
                    return (
                      <StepRow
                        key={step.stepId}
                        step={step}
                        invokeMasked={maskedOutput}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 목록 화면 ───────────────────────────────────────────────────────────────

function ListPanel({ onSelect }: { onSelect: (id: string) => void }) {
  const toast = useToast();
  const [items, setItems] = useState<WorkflowExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [stateFilter, setStateFilter] = useState<string>("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageIdx: number, state: string) => {
    // spec §4 I1 상태 필터 검증
    const validation = validateStateFilter(state || undefined);
    if (!validation.valid) {
      setFilterError(validation.message ?? "상태 오류");
      return;
    }
    setFilterError(null);
    setLoading(true);
    try {
      const params: WorkflowExecutionListParams = {
        limit: PAGE_SIZE,
        offset: pageIdx * PAGE_SIZE,
      };
      if (state) params.state = state as TransactionState;
      const res = await listWorkflowExecutions(params);
      setItems(res.workflow_executions ?? []);
      setTotal(res.count ?? 0);
    } catch (e) {
      toast.show((e as Error)?.message ?? "목록 조회 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(page, stateFilter);
  }, [load, page, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* 필터 + 새로고침 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <div>
          <span className="field-l" style={{ marginRight: 6, fontSize: 13 }}>상태</span>
          <select
            className="inp"
            style={{ width: "auto", display: "inline-block" }}
            value={stateFilter}
            onChange={(e) => { setPage(0); setStateFilter(e.target.value); }}
          >
            {STATE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {filterError && (
            <span style={{ color: "var(--danger)", fontSize: 12, marginLeft: 8 }}>{filterError}</span>
          )}
        </div>
        <button
          type="button"
          className="btn ghost"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}
          onClick={() => load(page, stateFilter)}
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* 목록 테이블 */}
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>워크플로우 실행 기록이 없습니다.</div>
          ) : (
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--text-2)" }}>워크플로우</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--text-2)" }}>상태</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--text-2)" }}>시작</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--text-2)" }}>업데이트</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "var(--text-2)" }}>트랜잭션 ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    className="dline"
                    onClick={() => onSelect(item.id)}
                    data-wf-id={item.id}
                  >
                    <td style={{ padding: "10px 16px" }}>
                      <code style={{ fontSize: 12.5, fontWeight: 700 }}>{item.workflow_id}</code>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <StateBadge state={item.state} />
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-2)", fontSize: 12.5 }}>
                      {fmt(item.created_at)}
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--text-2)", fontSize: 12.5 }}>
                      {fmt(item.updated_at)}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <code style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {item.transaction_id?.slice(0, 16)}…
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            className="btn ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            이전
          </button>
          <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: "32px" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="btn ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function WorkflowLogsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>워크플로우 로그</h1>
            <div className="ph-sub">Medusa 비동기 처리 실행 이력 조회 · 단계별 입출력 추적</div>
          </div>
        </div>

        {/* 콘텐츠 */}
        {selectedId ? (
          <DetailPanel
            executionId={selectedId}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <ListPanel onSelect={(id) => setSelectedId(id)} />
        )}
      </div>
    </div>
  );
}

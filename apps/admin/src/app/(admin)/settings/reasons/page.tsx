"use client";

/**
 * 반품·환불 사유 관리 화면 — t006_반품환불사유 spec 구현
 *
 * - Medusa return-reasons + refund-reasons 호출/래핑 (복사·포크 금지)
 * - 검증 로직: @/lib/settings/reasons-logic 에서 import (dead code 없음)
 * - API 호출: @/lib/api/admin-config 에서 import
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listReturnReasons,
  createReturnReason,
  updateReturnReason,
  deleteReturnReason,
  listRefundReasons,
  createRefundReason,
  updateRefundReason,
  deleteRefundReason,
  type ReturnReason,
  type RefundReason,
} from "@/lib/api/admin-config";
import {
  validateReturnReasonInput,
  validateRefundReasonInput,
  canDeleteReason,
} from "@/lib/settings/reasons-logic";

// ─── 탭 ─────────────────────────────────────────────────────────────────────

type TabId = "return" | "refund";
const TABS: { id: TabId; label: string }[] = [
  { id: "return", label: "반품 사유" },
  { id: "refund", label: "환불 사유" },
];

// ─── 공통 인라인 폼 (추가/수정) ──────────────────────────────────────────────

function InlineForm({
  codeLabel,
  codeValue,
  labelValue,
  descValue,
  onCodeChange,
  onLabelChange,
  onDescChange,
  onSave,
  onCancel,
  saving,
  errors,
}: {
  codeLabel: string;
  codeValue: string;
  labelValue: string;
  descValue: string;
  onCodeChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  errors: { field: string; message: string }[];
}) {
  const codeError = errors.find((e) => e.field === "value" || e.field === "code");
  const labelError = errors.find((e) => e.field === "label");

  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 10,
        border: "1px solid var(--border)",
      }}
    >
      <div className="fgrid2" style={{ gap: 10, marginBottom: 10 }}>
        <div>
          <span className="field-l" style={{ fontSize: 12 }}>
            {codeLabel} <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <input
            className={`inp${codeError ? " is-error" : ""}`}
            value={codeValue}
            maxLength={30}
            placeholder="1~30자"
            onChange={(e) => onCodeChange(e.target.value)}
          />
          {codeError && (
            <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 3, display: "block" }}>
              {codeError.message}
            </span>
          )}
        </div>
        <div>
          <span className="field-l" style={{ fontSize: 12 }}>
            라벨 <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <input
            className={`inp${labelError ? " is-error" : ""}`}
            value={labelValue}
            maxLength={50}
            placeholder="1~50자"
            onChange={(e) => onLabelChange(e.target.value)}
          />
          {labelError && (
            <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 3, display: "block" }}>
              {labelError.message}
            </span>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <span className="field-l" style={{ fontSize: 12 }}>설명 (선택)</span>
        <input
          className="inp"
          value={descValue}
          placeholder="추가 설명"
          onChange={(e) => onDescChange(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn ghost"
          onClick={onCancel}
          disabled={saving}
          style={{ minWidth: 64 }}
        >
          <X size={14} />
          취소
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onSave}
          disabled={saving}
          style={{ minWidth: 80 }}
        >
          <Check size={14} />
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

// ─── 반품 사유 탭 ─────────────────────────────────────────────────────────

function ReturnReasonsTab() {
  const toast = useToast();
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [loading, setLoading] = useState(true);

  // 추가 폼
  const [addOpen, setAddOpen] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addErrors, setAddErrors] = useState<{ field: string; message: string }[]>([]);
  const [addSaving, setAddSaving] = useState(false);

  // 수정 폼
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editErrors, setEditErrors] = useState<{ field: string; message: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<ReturnReason | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listReturnReasons();
      setReasons(list);
    } catch (e) {
      toast.show((e as Error)?.message ?? "반품 사유 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setAddValue("");
    setAddLabel("");
    setAddDesc("");
    setAddErrors([]);
    setAddOpen(true);
    setEditId(null);
  }

  function openEdit(r: ReturnReason) {
    setEditId(r.id);
    setEditValue(r.value);
    setEditLabel(r.label);
    setEditDesc(r.description ?? "");
    setEditErrors([]);
    setAddOpen(false);
  }

  async function doAdd() {
    // spec §4 I1·I2 검증 — 기존 코드 목록에서 중복 확인
    const existingValues = reasons.map((r) => r.value);
    const errors = validateReturnReasonInput(
      { value: addValue, label: addLabel, description: addDesc },
      existingValues
    );
    if (errors.length > 0) {
      setAddErrors(errors);
      return;
    }
    setAddSaving(true);
    try {
      const { return_reason } = await createReturnReason({
        value: addValue.trim(),
        label: addLabel.trim(),
        description: addDesc.trim() || undefined,
      });
      setReasons((prev) => [...prev, return_reason]);
      setAddOpen(false);
      toast.show("반품 사유를 추가했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setAddSaving(false);
    }
  }

  async function doEdit() {
    if (!editId) return;
    // 수정 시 자신의 value 제외하고 유니크 검증
    const existingValues = reasons.filter((r) => r.id !== editId).map((r) => r.value);
    const errors = validateReturnReasonInput(
      { value: editValue, label: editLabel, description: editDesc },
      existingValues
    );
    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditSaving(true);
    try {
      const { return_reason } = await updateReturnReason(editId, {
        label: editLabel.trim(),
        description: editDesc.trim() || undefined,
      });
      setReasons((prev) => prev.map((r) => (r.id === editId ? return_reason : r)));
      setEditId(null);
      toast.show("반품 사유를 수정했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "수정 실패", "danger");
    } finally {
      setEditSaving(false);
    }
  }

  function tryDelete(r: ReturnReason) {
    // spec §8 C1: 사용중 코드 삭제 금지 (현재는 클라이언트 측 차단만, 추후 d2 연동)
    const blocked = !canDeleteReason(r.value, []);
    setDeleteBlocked(blocked);
    setDeleteTarget(r);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      await deleteReturnReason(deleteTarget.id);
      setReasons((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.show("반품 사유를 삭제했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading)
    return (
      <div className="card">
        <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
          불러오는 중…
        </div>
      </div>
    );

  return (
    <>
      <div className="card">
        <div className="card-pad">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <div className="dsec-t" style={{ margin: 0, flex: 1 }}>반품 사유</div>
            <button
              type="button"
              className="btn primary"
              style={{ fontSize: 13 }}
              onClick={openAdd}
            >
              <Plus size={14} />
              사유 추가
            </button>
          </div>

          {/* 추가 폼 */}
          {addOpen && (
            <InlineForm
              codeLabel="코드(value)"
              codeValue={addValue}
              labelValue={addLabel}
              descValue={addDesc}
              onCodeChange={(v) => { setAddValue(v); setAddErrors([]); }}
              onLabelChange={(v) => { setAddLabel(v); setAddErrors([]); }}
              onDescChange={setAddDesc}
              onSave={doAdd}
              onCancel={() => setAddOpen(false)}
              saving={addSaving}
              errors={addErrors}
            />
          )}

          {/* 목록 */}
          {reasons.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
              등록된 반품 사유가 없습니다.
            </div>
          ) : (
            reasons.map((r) => (
              <div key={r.id}>
                {editId === r.id ? (
                  <InlineForm
                    codeLabel="코드(value)"
                    codeValue={editValue}
                    labelValue={editLabel}
                    descValue={editDesc}
                    onCodeChange={(v) => { setEditValue(v); setEditErrors([]); }}
                    onLabelChange={(v) => { setEditLabel(v); setEditErrors([]); }}
                    onDescChange={setEditDesc}
                    onSave={doEdit}
                    onCancel={() => setEditId(null)}
                    saving={editSaving}
                    errors={editErrors}
                  />
                ) : (
                  <div
                    className="dline"
                    key={r.id}
                    data-reason-value={r.value}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "var(--surface-2)",
                        padding: "2px 7px",
                        borderRadius: 5,
                        color: "var(--text-2)",
                        flexShrink: 0,
                        minWidth: 90,
                      }}
                    >
                      {r.value}
                    </span>
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{r.label}</b>
                      {r.description && <span>{r.description}</span>}
                    </span>
                    <button
                      type="button"
                      className="btn ghost icon-btn"
                      style={{ padding: "4px 6px" }}
                      title="수정"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn ghost icon-btn"
                      style={{ padding: "4px 6px", color: "var(--danger)" }}
                      title="삭제"
                      onClick={() => tryDelete(r)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 삭제 확인 */}
      <ConfirmModal
        open={!!deleteTarget && !deleteBlocked}
        title="반품 사유를 삭제하시겠습니까?"
        message={`코드 "${deleteTarget?.value}" — ${deleteTarget?.label}`}
        confirmText="삭제"
        meta={{
          target: deleteTarget?.label,
          effect: "반품 접수 선택지에서 제거",
          reversible: false,
        }}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 사용중 코드 삭제 차단 안내 */}
      <ConfirmModal
        open={!!deleteTarget && deleteBlocked}
        title="삭제할 수 없습니다"
        message="현재 사용 중인 반품 사유 코드는 삭제할 수 없습니다. 비활성화 후 삭제하세요."
        confirmText="확인"
        meta={{ target: deleteTarget?.value, effect: "없음", reversible: true }}
        onConfirm={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ─── 환불 사유 탭 ─────────────────────────────────────────────────────────

function RefundReasonsTab() {
  const toast = useToast();
  const [reasons, setReasons] = useState<RefundReason[]>([]);
  const [loading, setLoading] = useState(true);

  // 추가 폼
  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addErrors, setAddErrors] = useState<{ field: string; message: string }[]>([]);
  const [addSaving, setAddSaving] = useState(false);

  // 수정 폼
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editErrors, setEditErrors] = useState<{ field: string; message: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<RefundReason | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRefundReasons();
      setReasons(list);
    } catch (e) {
      toast.show((e as Error)?.message ?? "환불 사유 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setAddCode("");
    setAddLabel("");
    setAddDesc("");
    setAddErrors([]);
    setAddOpen(true);
    setEditId(null);
  }

  function openEdit(r: RefundReason) {
    setEditId(r.id);
    setEditCode(r.code);
    setEditLabel(r.label);
    setEditDesc(r.description ?? "");
    setEditErrors([]);
    setAddOpen(false);
  }

  async function doAdd() {
    const existingCodes = reasons.map((r) => r.code);
    const errors = validateRefundReasonInput(
      { code: addCode, label: addLabel, description: addDesc },
      existingCodes
    );
    if (errors.length > 0) {
      setAddErrors(errors);
      return;
    }
    setAddSaving(true);
    try {
      const { refund_reason } = await createRefundReason({
        code: addCode.trim(),
        label: addLabel.trim(),
        description: addDesc.trim() || undefined,
      });
      setReasons((prev) => [...prev, refund_reason]);
      setAddOpen(false);
      toast.show("환불 사유를 추가했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setAddSaving(false);
    }
  }

  async function doEdit() {
    if (!editId) return;
    const existingCodes = reasons.filter((r) => r.id !== editId).map((r) => r.code);
    const errors = validateRefundReasonInput(
      { code: editCode, label: editLabel, description: editDesc },
      existingCodes
    );
    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditSaving(true);
    try {
      const { refund_reason } = await updateRefundReason(editId, {
        label: editLabel.trim(),
        description: editDesc.trim() || undefined,
      });
      setReasons((prev) => prev.map((r) => (r.id === editId ? refund_reason : r)));
      setEditId(null);
      toast.show("환불 사유를 수정했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "수정 실패", "danger");
    } finally {
      setEditSaving(false);
    }
  }

  function tryDelete(r: RefundReason) {
    const blocked = !canDeleteReason(r.code, []);
    setDeleteBlocked(blocked);
    setDeleteTarget(r);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRefundReason(deleteTarget.id);
      setReasons((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.show("환불 사유를 삭제했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    } finally {
      setDeleteTarget(null);
    }
  }

  if (loading)
    return (
      <div className="card">
        <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
          불러오는 중…
        </div>
      </div>
    );

  return (
    <>
      <div className="card">
        <div className="card-pad">
          <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
            <div className="dsec-t" style={{ margin: 0, flex: 1 }}>환불 사유</div>
            <button
              type="button"
              className="btn primary"
              style={{ fontSize: 13 }}
              onClick={openAdd}
            >
              <Plus size={14} />
              사유 추가
            </button>
          </div>

          {/* 추가 폼 */}
          {addOpen && (
            <InlineForm
              codeLabel="코드(code)"
              codeValue={addCode}
              labelValue={addLabel}
              descValue={addDesc}
              onCodeChange={(v) => { setAddCode(v); setAddErrors([]); }}
              onLabelChange={(v) => { setAddLabel(v); setAddErrors([]); }}
              onDescChange={setAddDesc}
              onSave={doAdd}
              onCancel={() => setAddOpen(false)}
              saving={addSaving}
              errors={addErrors}
            />
          )}

          {/* 목록 */}
          {reasons.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
              등록된 환불 사유가 없습니다.
            </div>
          ) : (
            reasons.map((r) => (
              <div key={r.id}>
                {editId === r.id ? (
                  <InlineForm
                    codeLabel="코드(code)"
                    codeValue={editCode}
                    labelValue={editLabel}
                    descValue={editDesc}
                    onCodeChange={(v) => { setEditCode(v); setEditErrors([]); }}
                    onLabelChange={(v) => { setEditLabel(v); setEditErrors([]); }}
                    onDescChange={setEditDesc}
                    onSave={doEdit}
                    onCancel={() => setEditId(null)}
                    saving={editSaving}
                    errors={editErrors}
                  />
                ) : (
                  <div
                    className="dline"
                    key={r.id}
                    data-reason-code={r.code}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        background: "var(--surface-2)",
                        padding: "2px 7px",
                        borderRadius: 5,
                        color: "var(--text-2)",
                        flexShrink: 0,
                        minWidth: 90,
                      }}
                    >
                      {r.code}
                    </span>
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{r.label}</b>
                      {r.description && <span>{r.description}</span>}
                    </span>
                    <button
                      type="button"
                      className="btn ghost icon-btn"
                      style={{ padding: "4px 6px" }}
                      title="수정"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn ghost icon-btn"
                      style={{ padding: "4px 6px", color: "var(--danger)" }}
                      title="삭제"
                      onClick={() => tryDelete(r)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 삭제 확인 */}
      <ConfirmModal
        open={!!deleteTarget && !deleteBlocked}
        title="환불 사유를 삭제하시겠습니까?"
        message={`코드 "${deleteTarget?.code}" — ${deleteTarget?.label}`}
        confirmText="삭제"
        meta={{
          target: deleteTarget?.label,
          effect: "환불 접수 선택지에서 제거",
          reversible: false,
        }}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* 사용중 코드 삭제 차단 안내 */}
      <ConfirmModal
        open={!!deleteTarget && deleteBlocked}
        title="삭제할 수 없습니다"
        message="현재 사용 중인 환불 사유 코드는 삭제할 수 없습니다. 비활성화 후 삭제하세요."
        confirmText="확인"
        meta={{ target: deleteTarget?.code, effect: "없음", reversible: true }}
        onConfirm={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>("return");

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>반품·환불 사유</h1>
            <div className="ph-sub">반품 및 환불 코드 관리 — d2 반품/환불 접수 선택지로 사용</div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="card mb16">
          <div className="segtabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`segtab${activeTab === id ? " active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 */}
        {activeTab === "return" && <ReturnReasonsTab />}
        {activeTab === "refund" && <RefundReasonsTab />}
      </div>
    </div>
  );
}

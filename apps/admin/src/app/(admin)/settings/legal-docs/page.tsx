"use client";

/**
 * 약관 관리 화면 — t008_약관관리 spec 구현
 *
 * - 약관 종류·버전 목록 표시 / 새 버전(draft) 작성 / 게시(publish) 액션
 * - 게시된 약관 본문 직접 수정 금지(새 버전 강제)
 * - requires_consent=true 이면 "동의 재요청 트리거" 배지 표시
 * - backend API: /admin/legal-docs (GET 목록, POST 초안), /admin/legal-docs/:id/publish
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Send, X, Check, FileText } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listLegalDocs,
  createDraft,
  publishDoc,
  LEGAL_DOC_TYPE_LABELS,
  type LegalDoc,
  type LegalDocType,
  type LegalDocStatus,
  type CreateDraftInput,
} from "@/lib/api/legal-docs";

// ─── 상수 ───────────────────────────────────────────────────────────────────

const DOC_TYPES: LegalDocType[] = [
  "terms_of_service",
  "privacy_policy",
  "marketing_consent",
  "third_party_consent",
];

const STATUS_LABELS: Record<LegalDocStatus, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

const STATUS_COLORS: Record<LegalDocStatus, string> = {
  draft: "var(--text-3)",
  published: "var(--success, #16a34a)",
  archived: "var(--text-3)",
};

// ─── 상태 배지 ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LegalDocStatus }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        background: status === "published" ? "#dcfce7" : status === "draft" ? "#f1f5f9" : "#f8fafc",
        color: STATUS_COLORS[status],
        border: `1px solid ${status === "published" ? "#bbf7d0" : "var(--border)"}`,
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── 초안 작성 폼 ──────────────────────────────────────────────────────────

function DraftForm({
  defaultType,
  onSaved,
  onCancel,
}: {
  defaultType?: LegalDocType;
  onSaved: (doc: LegalDoc) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<LegalDocType>(defaultType ?? "terms_of_service");
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [requiresConsent, setRequiresConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!version.trim()) errs.version = "버전을 입력하세요.";
    if (!body.trim()) errs.body = "본문을 입력하세요.";
    if (!effectiveAt) errs.effectiveAt = "시행일을 입력하세요.";
    else if (new Date(effectiveAt) < new Date(new Date().toDateString())) {
      errs.effectiveAt = "시행일은 오늘 이후여야 합니다.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function doSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const input: CreateDraftInput = {
        type,
        version: version.trim(),
        body: body.trim(),
        effective_at: new Date(effectiveAt).toISOString(),
        requires_consent: requiresConsent,
      };
      const { doc } = await createDraft(input);
      toast.show("약관 초안을 저장했습니다.", "success");
      onSaved(doc);
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: 10,
        padding: "16px 18px",
        marginBottom: 16,
        border: "1px solid var(--border)",
      }}
    >
      <div className="dsec-t" style={{ marginBottom: 14, fontSize: 14 }}>새 약관 초안 작성</div>

      {/* 종류 */}
      <div style={{ marginBottom: 12 }}>
        <span className="field-l" style={{ fontSize: 12 }}>
          약관 종류 <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <select
          className="inp"
          value={type}
          onChange={(e) => setType(e.target.value as LegalDocType)}
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{LEGAL_DOC_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* 버전 + 시행일 */}
      <div className="fgrid2" style={{ gap: 10, marginBottom: 12 }}>
        <div>
          <span className="field-l" style={{ fontSize: 12 }}>
            버전 <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <input
            className={`inp${errors.version ? " is-error" : ""}`}
            value={version}
            placeholder="예: v2.0, 2026-06-01"
            maxLength={30}
            onChange={(e) => { setVersion(e.target.value); setErrors((p) => ({ ...p, version: "" })); }}
          />
          {errors.version && (
            <span style={{ fontSize: 11, color: "var(--danger)", display: "block", marginTop: 3 }}>{errors.version}</span>
          )}
        </div>
        <div>
          <span className="field-l" style={{ fontSize: 12 }}>
            시행일 <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <input
            type="date"
            className={`inp${errors.effectiveAt ? " is-error" : ""}`}
            value={effectiveAt}
            onChange={(e) => { setEffectiveAt(e.target.value); setErrors((p) => ({ ...p, effectiveAt: "" })); }}
          />
          {errors.effectiveAt && (
            <span style={{ fontSize: 11, color: "var(--danger)", display: "block", marginTop: 3 }}>{errors.effectiveAt}</span>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ marginBottom: 12 }}>
        <span className="field-l" style={{ fontSize: 12 }}>
          약관 본문 <span style={{ color: "var(--danger)" }}>*</span>
        </span>
        <textarea
          className={`inp${errors.body ? " is-error" : ""}`}
          value={body}
          rows={6}
          placeholder="약관 전문을 입력하세요."
          style={{ resize: "vertical", minHeight: 120 }}
          onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: "" })); }}
        />
        {errors.body && (
          <span style={{ fontSize: 11, color: "var(--danger)", display: "block", marginTop: 3 }}>{errors.body}</span>
        )}
      </div>

      {/* 동의 재요청 */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          id="requires_consent"
          checked={requiresConsent}
          onChange={(e) => setRequiresConsent(e.target.checked)}
          style={{ width: 15, height: 15 }}
        />
        <label htmlFor="requires_consent" style={{ fontSize: 13, cursor: "pointer" }}>
          필수 동의 재요청 (개정 시 회원 동의 재수집)
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving} style={{ minWidth: 64 }}>
          <X size={14} /> 취소
        </button>
        <button type="button" className="btn primary" onClick={doSave} disabled={saving} style={{ minWidth: 80 }}>
          <Check size={14} /> {saving ? "저장 중…" : "초안 저장"}
        </button>
      </div>
    </div>
  );
}

// ─── 약관 행 컴포넌트 ──────────────────────────────────────────────────────

function DocRow({
  doc,
  onPublish,
}: {
  doc: LegalDoc;
  onPublish: (doc: LegalDoc) => void;
}) {
  const effectiveDate = new Date(doc.effective_at).toLocaleDateString("ko-KR");
  const publishedDate = doc.published_at
    ? new Date(doc.published_at).toLocaleDateString("ko-KR")
    : null;

  return (
    <div className="dline" style={{ alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {LEGAL_DOC_TYPE_LABELS[doc.type]}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              background: "var(--surface-2)",
              padding: "1px 6px",
              borderRadius: 4,
              color: "var(--text-2)",
            }}
          >
            {doc.version}
          </span>
          <StatusBadge status={doc.status} />
          {doc.requires_consent && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 20,
                background: "#fef9c3",
                color: "#92400e",
                border: "1px solid #fde68a",
              }}
            >
              동의 재요청
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 12 }}>
          <span>시행일: {effectiveDate}</span>
          {publishedDate && <span>게시일: {publishedDate}</span>}
          {doc.published_by && <span>게시자: {doc.published_by}</span>}
        </div>
      </div>
      {doc.status === "draft" && (
        <button
          type="button"
          className="btn primary"
          style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => onPublish(doc)}
        >
          <Send size={13} />
          게시
        </button>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function LegalDocsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<LegalDoc | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { docs: list } = await listLegalDocs();
      setDocs(list);
    } catch (e) {
      toast.show((e as Error)?.message ?? "약관 목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(doc: LegalDoc) {
    setDocs((prev) => [doc, ...prev]);
    setAddOpen(false);
  }

  async function doPublish() {
    if (!publishTarget) return;
    setPublishing(true);
    try {
      const res = await publishDoc(publishTarget.id);
      setDocs((prev) => prev.map((d) => (d.id === publishTarget.id ? res.doc : d)));
      if (res.consent_trigger) {
        toast.show("약관을 게시했습니다. 동의 재요청이 트리거되었습니다.", "success");
      } else {
        toast.show("약관을 게시했습니다.", "success");
      }
    } catch (e) {
      toast.show((e as Error)?.message ?? "게시 실패", "danger");
    } finally {
      setPublishing(false);
      setPublishTarget(null);
    }
  }

  // 종류별로 그룹화
  const grouped: Record<string, LegalDoc[]> = {};
  for (const doc of docs) {
    if (!grouped[doc.type]) grouped[doc.type] = [];
    grouped[doc.type].push(doc);
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>약관 관리</h1>
            <div className="ph-sub">이용약관·개인정보처리방침 등 버전별 관리 — 게시 후 본문 수정 불가(새 버전 생성)</div>
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={15} />
            새 약관 초안
          </button>
        </div>

        {/* 초안 작성 폼 */}
        {addOpen && (
          <DraftForm
            onSaved={handleSaved}
            onCancel={() => setAddOpen(false)}
          />
        )}

        {/* 목록 */}
        {loading ? (
          <div className="card">
            <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          </div>
        ) : docs.length === 0 ? (
          <div className="card">
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 10 }}>
              <FileText size={36} style={{ color: "var(--text-3)" }} />
              <div style={{ color: "var(--text-3)", fontSize: 14 }}>등록된 약관이 없습니다.</div>
              <button type="button" className="btn primary" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> 첫 약관 초안 작성
              </button>
            </div>
          </div>
        ) : (
          DOC_TYPES.map((type) => {
            const typeDocs = grouped[type] ?? [];
            return (
              <div key={type} className="card mb16">
                <div className="card-pad">
                  <div className="dsec-t" style={{ marginBottom: 8 }}>
                    {LEGAL_DOC_TYPE_LABELS[type]}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 8 }}>
                      {typeDocs.length}건
                    </span>
                  </div>
                  {typeDocs.length === 0 ? (
                    <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>
                      등록된 버전이 없습니다.
                    </div>
                  ) : (
                    typeDocs.map((doc) => (
                      <DocRow key={doc.id} doc={doc} onPublish={setPublishTarget} />
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 게시 확인 모달 */}
      <ConfirmModal
        open={!!publishTarget && !publishing}
        title="약관을 게시하시겠습니까?"
        message={
          publishTarget
            ? `${LEGAL_DOC_TYPE_LABELS[publishTarget.type]} ${publishTarget.version}${
                publishTarget.requires_consent ? "\n\n⚠ 필수 동의 약관으로 동의 재요청이 트리거됩니다." : ""
              }`
            : ""
        }
        confirmText="게시"
        meta={{
          target: publishTarget ? `${LEGAL_DOC_TYPE_LABELS[publishTarget.type]} ${publishTarget.version}` : "",
          effect: "draft → published (이후 본문 수정 불가)",
          reversible: false,
        }}
        onConfirm={doPublish}
        onCancel={() => setPublishTarget(null)}
      />
    </div>
  );
}

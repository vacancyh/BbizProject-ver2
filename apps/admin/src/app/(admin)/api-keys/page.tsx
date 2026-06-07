"use client";

/**
 * API/연동 키 관리 화면 — t004_API연동키 spec 구현
 *
 * Medusa api-key-management 호출/래핑:
 *  - Publishable / Secret 키 목록(마스킹) 조회
 *  - 키 발급: 생성 직후 평문 1회 노출 → 이후 마스킹(spec §8 C1)
 *  - 키 폐기(revoke)
 *  - 판매채널 연결(sales-channels)
 *
 * production import:
 *  lib/api/api-keys.ts → listApiKeys / createApiKey / revokeApiKey / updateApiKeySalesChannels
 *  lib/settings/api-key-logic.ts → validateApiKeyInput / maskToken / isRevoked / apiKeyTypeLabel
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Link2, Eye, EyeOff, Check } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  updateApiKeySalesChannels,
  type ApiKeyRow,
  type ApiKeyType,
  type ApiKeyCreatedResponse,
} from "@/lib/api/api-keys";
import {
  validateApiKeyInput,
  maskToken,
  isRevoked,
  apiKeyTypeLabel,
} from "@/lib/settings/api-key-logic";

// ─── 결과 모달 ────────────────────────────────────────────────────────────────

function ResultModal({
  open,
  status,
  title,
  msg,
  onClose,
}: {
  open: boolean;
  status: "success" | "fail";
  title: string;
  msg: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          textAlign: "center",
          background: "var(--surface)",
          borderRadius: 16,
          padding: "26px 24px 22px",
          width: 380,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
            background:
              status === "success" ? "var(--success-weak)" : "var(--danger-weak)",
            color:
              status === "success" ? "var(--success)" : "var(--danger)",
          }}
        >
          <Check size={26} />
        </div>
        <h3 style={{ margin: "0 0 7px", fontSize: 17, fontWeight: 800 }}>
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 20px",
            color: "var(--text-2)",
            fontSize: 13.5,
            lineHeight: 1.6,
          }}
        >
          {msg}
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn primary"
            style={{ minWidth: 120, justifyContent: "center" }}
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 키 발급 모달 ─────────────────────────────────────────────────────────────

function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (res: ApiKeyCreatedResponse) => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<ApiKeyType>("publishable");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  function reset() {
    setType("publishable");
    setTitle("");
    setCreating(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    const errors = validateApiKeyInput({ type, title });
    if (errors.length > 0) {
      toast.show(errors[0].message, "danger");
      return;
    }
    setCreating(true);
    try {
      const res = await createApiKey({ type, title: title.trim() });
      reset();
      onCreated(res);
    } catch (e) {
      toast.show((e as Error)?.message ?? "키 발급 실패", "danger");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "28px 24px 24px",
          width: 420,
          maxWidth: "94vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800 }}>
          API 키 발급
        </h3>

        {/* 종류 선택 (I1) */}
        <div className="frow">
          <span className="field-l">키 종류</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["publishable", "secret"] as ApiKeyType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn${type === t ? " primary" : ""}`}
                style={{ minWidth: 110 }}
                onClick={() => setType(t)}
              >
                {apiKeyTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 입력 (I2) */}
        <div className="frow" style={{ marginBottom: 0 }}>
          <span className="field-l">제목 (1~50자)</span>
          <input
            className="inp"
            value={title}
            maxLength={50}
            placeholder="예: 프론트엔드 스토어키"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={creating}
          >
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
          >
            {creating ? "발급 중…" : "발급"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 발급 완료 모달 (평문 1회 노출) ───────────────────────────────────────────

function TokenRevealModal({
  open,
  token,
  onClose,
}: {
  open: boolean;
  token: string;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  function handleClose() {
    setRevealed(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "26px 24px 22px",
          width: 460,
          maxWidth: "94vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800 }}>
          키 발급 완료
        </h3>
        <p style={{ margin: "0 0 16px", color: "var(--text-2)", fontSize: 13 }}>
          보안상 이유로 토큰은 지금만 확인할 수 있습니다. 안전한 곳에 보관하세요.
        </p>

        {/* 평문 토큰 표시 영역 (spec §8 C1: 1회 노출) */}
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 13,
            letterSpacing: "0.03em",
            wordBreak: "break-all",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <span style={{ flex: 1 }}>
            {revealed ? token : maskToken(token)}
          </span>
          <button
            type="button"
            className="btn"
            style={{ flexShrink: 0, padding: "4px 8px" }}
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? "숨기기" : "보기"}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn primary"
            style={{ minWidth: 100 }}
            onClick={handleClose}
          >
            확인 (닫기)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 채널 연결 모달 ───────────────────────────────────────────────────────────

function ChannelLinkModal({
  open,
  targetKey,
  onClose,
  onUpdated,
}: {
  open: boolean;
  targetKey: ApiKeyRow | null;
  onClose: () => void;
  onUpdated: (updated: ApiKeyRow) => void;
}) {
  const toast = useToast();
  // 채널 id 입력(쉼표 구분) — 실제 채널 목록 피커는 QA(실브라우저) 범위
  const [addIds, setAddIds] = useState("");
  const [removeIds, setRemoveIds] = useState("");
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setAddIds("");
    setRemoveIds("");
    onClose();
  }

  async function handleSave() {
    if (!targetKey) return;
    const add = addIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const remove = removeIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!add.length && !remove.length) {
      toast.show("변경할 채널이 없습니다.", "danger");
      return;
    }
    setSaving(true);
    try {
      const res = await updateApiKeySalesChannels(targetKey.id, {
        ...(add.length ? { add } : {}),
        ...(remove.length ? { remove } : {}),
      });
      onUpdated(res.api_key);
      handleClose();
    } catch (e) {
      toast.show((e as Error)?.message ?? "채널 연결 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !targetKey) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "28px 24px 24px",
          width: 420,
          maxWidth: "94vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800 }}>
          판매채널 연결
        </h3>
        <p style={{ margin: "0 0 16px", color: "var(--text-2)", fontSize: 13 }}>
          {targetKey.title}
        </p>

        <div className="frow">
          <span className="field-l">연결할 채널 ID</span>
          <input
            className="inp"
            placeholder="채널 id (쉼표 구분)"
            value={addIds}
            onChange={(e) => setAddIds(e.target.value)}
          />
        </div>

        <div className="frow" style={{ marginBottom: 0 }}>
          <span className="field-l">해제할 채널 ID</span>
          <input
            className="inp"
            placeholder="채널 id (쉼표 구분)"
            value={removeIds}
            onChange={(e) => setRemoveIds(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 20,
          }}
        >
          <button type="button" className="btn" onClick={handleClose}>
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function Page() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 발급 모달
  const [createOpen, setCreateOpen] = useState(false);
  // 평문 토큰 1회 노출 모달
  const [revealToken, setRevealToken] = useState<string | null>(null);
  // 폐기 Confirm
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  // 폐기 결과
  const [revokeResultOpen, setRevokeResultOpen] = useState(false);
  // 채널 연결 모달
  const [channelTarget, setChannelTarget] = useState<ApiKeyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listApiKeys();
      setKeys(res.api_keys);
    } catch (e) {
      toast.show((e as Error)?.message ?? "API 키 목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    try {
      const res = await revokeApiKey(revokeTarget.id);
      setKeys((prev) =>
        prev.map((k) => (k.id === revokeTarget.id ? res.api_key : k))
      );
      setRevokeResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "폐기 실패", "danger");
    } finally {
      setRevokeTarget(null);
    }
  }

  function handleCreated(res: ApiKeyCreatedResponse) {
    // 목록에 신규 키 추가 후 평문 토큰 1회 노출
    setKeys((prev) => [res.api_key, ...prev]);
    setRevealToken(res.api_key.token);
  }

  function handleChannelUpdated(updated: ApiKeyRow) {
    setKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    toast.show("판매채널이 업데이트되었습니다.", "success");
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>API / 연동 키</h1>
            <div className="ph-sub">
              Publishable / Secret 키 발급 · 폐기 · 판매채널 연결
            </div>
          </div>
          <div className="ph-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} />
              <span>키 발급</span>
            </button>
          </div>
        </div>

        {/* 키 목록 */}
        <div className="card">
          <div className="card-pad">
            <div className="dsec-t">API 키 목록</div>

            {loading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : keys.length === 0 ? (
              <div
                style={{
                  color: "var(--text-3)",
                  fontSize: 13,
                  padding: "12px 0",
                }}
              >
                발급된 API 키가 없습니다.
              </div>
            ) : (
              keys.map((k) => {
                const revoked = isRevoked(k.revoked_at);
                return (
                  <div
                    className="dline"
                    key={k.id}
                    style={{
                      opacity: revoked ? 0.5 : 1,
                    }}
                  >
                    {/* 타입 배지 */}
                    <span
                      className={`badge ${k.type === "publishable" ? "success" : "danger"}`}
                      style={{ minWidth: 90 }}
                    >
                      <span className="bdot" />
                      {apiKeyTypeLabel(k.type)}
                    </span>

                    {/* 제목 + 마스킹 토큰 */}
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{k.title}</b>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--text-3)",
                        }}
                      >
                        {k.redacted}
                      </span>
                    </span>

                    {/* 폐기 상태 */}
                    {revoked && (
                      <span className="badge neutral">
                        <span className="bdot" />
                        폐기됨
                      </span>
                    )}

                    {/* 액션 버튼 */}
                    {!revoked && (
                      <>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          title="판매채널 연결"
                          onClick={() => setChannelTarget(k)}
                        >
                          <Link2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          title="폐기"
                          onClick={() => setRevokeTarget(k)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 키 발급 모달 */}
      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {/* 평문 1회 노출 모달 */}
      <TokenRevealModal
        open={revealToken !== null}
        token={revealToken ?? ""}
        onClose={() => setRevealToken(null)}
      />

      {/* 폐기 Confirm */}
      <ConfirmModal
        open={!!revokeTarget}
        title="API 키를 폐기하시겠습니까?"
        message="폐기된 키는 복구할 수 없습니다. 해당 키를 사용하는 서비스에서 즉시 오류가 발생합니다."
        confirmText="폐기"
        meta={{
          target: revokeTarget?.title,
          effect: "해당 키 즉시 사용 불가",
          reversible: false,
        }}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* 폐기 결과 */}
      <ResultModal
        open={revokeResultOpen}
        status="success"
        title="폐기했습니다."
        msg="API 키가 폐기되어 더 이상 사용할 수 없습니다."
        onClose={() => setRevokeResultOpen(false)}
      />

      {/* 채널 연결 모달 */}
      <ChannelLinkModal
        open={!!channelTarget}
        targetKey={channelTarget}
        onClose={() => setChannelTarget(null)}
        onUpdated={handleChannelUpdated}
      />
    </div>
  );
}

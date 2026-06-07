"use client";

/**
 * 판매채널 — t003_판매채널 화면.
 * Medusa sales-channels 호출/래핑. list / create / edit + add-products.
 * 단독몰 = 기본 1채널 기본. 기본 채널 삭제 금지(spec §3 S1).
 *
 * API 래퍼: @/lib/api/sales-channels
 * 검증 로직: @/lib/settings/channel-logic
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Pencil, Link } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listSalesChannels,
  createSalesChannel,
  updateSalesChannel,
  addProductsToChannel,
  type SalesChannel,
} from "@/lib/api/sales-channels";
import {
  validateChannelInput,
  isDefaultChannel,
} from "@/lib/settings/channel-logic";

// ─── 편집 모달 ──────────────────────────────────────────────────────────────

function ChannelEditModal({
  open,
  channel,
  onSave,
  onCancel,
}: {
  open: boolean;
  channel: SalesChannel | null;
  onSave: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setName(channel?.name ?? "");
      setDesc(channel?.description ?? "");
      setNameErr("");
    }
  }, [open, channel]);

  async function handleSave() {
    const errs = validateChannelInput({ name });
    if (errs.length > 0) {
      setNameErr(errs[0].message);
      return;
    }
    setSaving(true);
    try {
      await onSave(name.trim(), desc.trim());
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "26px 24px 22px",
          width: 440,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800 }}>
          {channel ? "채널 편집" : "채널 생성"}
        </h3>

        {/* 채널명 */}
        <div className="frow">
          <span className="field-l">
            채널명 <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <input
            className={`inp${nameErr ? " inp-err" : ""}`}
            value={name}
            maxLength={50}
            onChange={(e) => {
              setName(e.target.value);
              setNameErr("");
            }}
            placeholder="예: 메인 쇼핑몰"
          />
          {nameErr && (
            <span style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
              {nameErr}
            </span>
          )}
        </div>

        {/* 설명 */}
        <div className="frow" style={{ marginBottom: 0 }}>
          <span className="field-l">설명</span>
          <input
            className="inp"
            value={desc}
            maxLength={200}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="채널 설명 (선택)"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Check size={15} />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 상품 연결 모달 ─────────────────────────────────────────────────────────

function AddProductsModal({
  open,
  channel,
  onSave,
  onCancel,
}: {
  open: boolean;
  channel: SalesChannel | null;
  onSave: (productIds: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setRaw("");
      setErr("");
    }
  }, [open]);

  async function handleSave() {
    const ids = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setErr("상품 ID를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave(ids);
    } catch (e) {
      toast.show((e as Error)?.message ?? "연결 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "26px 24px 22px",
          width: 440,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>
          상품 연결
        </h3>
        <p style={{ margin: "0 0 16px", color: "var(--text-3)", fontSize: 13 }}>
          채널: <b>{channel?.name}</b>
        </p>

        <div className="frow" style={{ marginBottom: 0 }}>
          <span className="field-l">
            상품 ID <span style={{ color: "var(--danger)" }}>*</span>
          </span>
          <textarea
            className="inp"
            rows={5}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setErr(""); }}
            placeholder={"prod_01J...\nprod_01K...\n(줄바꿈 또는 쉼표로 구분)"}
            style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          />
          {err && (
            <span style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
              {err}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Link size={15} />
            {saving ? "연결 중…" : "연결"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 결과 토스트 래퍼 (인라인 메시지 표시용) ─────────────────────────────────

function InlineMsg({
  msg,
  type,
}: {
  msg: string;
  type: "success" | "danger" | null;
}) {
  if (!msg || !type) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: type === "success" ? "var(--success-weak)" : "var(--danger-weak)",
        color: type === "success" ? "var(--success)" : "var(--danger)",
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      {msg}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function ChannelsPage() {
  const toast = useToast();
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // 편집 모달
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SalesChannel | null>(null);

  // 상품 연결 모달
  const [addProductsOpen, setAddProductsOpen] = useState(false);
  const [addProductsTarget, setAddProductsTarget] = useState<SalesChannel | null>(null);

  // confirm (편집 전)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{ name: string; desc: string } | null>(null);

  // 인라인 메시지
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "danger" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSalesChannels();
      setChannels(res.sales_channels);
    } catch (e) {
      toast.show((e as Error)?.message ?? "채널 목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function showMsg(text: string, type: "success" | "danger") {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => { setMsg(""); setMsgType(null); }, 3500);
  }

  // 편집 모달 → confirm → 실제 저장
  function handleEditSaveRequest(name: string, desc: string) {
    setPendingEdit({ name, desc });
    setEditOpen(false);
    setConfirmOpen(true);
  }

  async function doSave() {
    if (!pendingEdit) return;
    setConfirmOpen(false);
    try {
      if (editTarget) {
        // 기존 채널 편집
        await updateSalesChannel(editTarget.id, {
          name: pendingEdit.name,
          description: pendingEdit.desc || undefined,
        });
        showMsg("채널을 수정했습니다.", "success");
      } else {
        // 채널 생성 — 첫 생성 시 기본 채널 자동 표시
        const isFirst = channels.length === 0;
        await createSalesChannel({
          name: pendingEdit.name,
          description: pendingEdit.desc || undefined,
          metadata: isFirst ? { is_default: true } : undefined,
        });
        showMsg("채널을 생성했습니다.", "success");
      }
      await load();
    } catch (e) {
      showMsg((e as Error)?.message ?? "저장 실패", "danger");
    }
    setPendingEdit(null);
    setEditTarget(null);
  }

  async function handleAddProducts(productIds: string[]) {
    if (!addProductsTarget) return;
    await addProductsToChannel(addProductsTarget.id, { product_ids: productIds });
    setAddProductsOpen(false);
    setAddProductsTarget(null);
    showMsg("상품 연결이 완료되었습니다.", "success");
    await load();
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>판매채널</h1>
            <div className="ph-sub">단독몰 기본 1채널 · Medusa sales-channels 래핑</div>
          </div>
          <div className="ph-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditTarget(null);
                setEditOpen(true);
              }}
            >
              <Plus size={15} />
              채널 추가
            </button>
          </div>
        </div>

        {/* 인라인 메시지 */}
        <InlineMsg msg={msg} type={msgType} />

        {/* 채널 목록 */}
        <div className="card">
          <div className="card-pad">
            <div className="dsec-t">채널 목록</div>

            {loading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
            ) : channels.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                등록된 판매채널이 없습니다. 채널을 추가해 주세요.
              </div>
            ) : (
              channels.map((ch) => {
                const isDefault = isDefaultChannel(ch.metadata);
                return (
                  <div
                    className="dline"
                    key={ch.id}
                    data-channel-id={ch.id}
                    data-channel-name={ch.name}
                  >
                    {/* 채널 이름 + 기본 여부 */}
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{ch.name}</b>
                      {ch.description && (
                        <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                          {ch.description}
                        </span>
                      )}
                    </span>

                    {/* 기본 채널 뱃지 */}
                    {isDefault && (
                      <span className="badge primary">
                        <span className="bdot" />
                        기본
                      </span>
                    )}

                    {/* 활성/비활성 뱃지 */}
                    <span className={`badge ${ch.is_disabled ? "neutral" : "success"}`}>
                      <span className="bdot" />
                      {ch.is_disabled ? "비활성" : "활성"}
                    </span>

                    {/* 액션 버튼 */}
                    <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => {
                          setAddProductsTarget(ch);
                          setAddProductsOpen(true);
                        }}
                        title="상품 연결"
                      >
                        <Link size={13} />
                        상품 연결
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => {
                          setEditTarget(ch);
                          setEditOpen(true);
                        }}
                        title="채널 편집"
                      >
                        <Pencil size={13} />
                        편집
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 안내 문구 */}
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
          단독몰은 기본 1채널 운영을 전제로 합니다. 기본 채널은 삭제할 수 없습니다.
        </div>
      </div>

      {/* 편집 모달 */}
      <ChannelEditModal
        open={editOpen}
        channel={editTarget}
        onSave={async (name, desc) => handleEditSaveRequest(name, desc)}
        onCancel={() => { setEditOpen(false); setEditTarget(null); }}
      />

      {/* 저장 Confirm */}
      <ConfirmModal
        open={confirmOpen}
        title={editTarget ? "채널을 수정하시겠습니까?" : "채널을 생성하시겠습니까?"}
        message={
          editTarget
            ? "채널 정보를 변경합니다. 쇼핑몰 노출에 반영됩니다."
            : "새 판매채널을 생성합니다."
        }
        confirmText={editTarget ? "수정" : "생성"}
        meta={{
          target: pendingEdit?.name,
          effect: "채널 정보 갱신",
          reversible: true,
        }}
        onConfirm={doSave}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingEdit(null);
          setEditTarget(null);
        }}
      />

      {/* 상품 연결 모달 */}
      <AddProductsModal
        open={addProductsOpen}
        channel={addProductsTarget}
        onSave={handleAddProducts}
        onCancel={() => { setAddProductsOpen(false); setAddProductsTarget(null); }}
      />
    </div>
  );
}

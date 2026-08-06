"use client";

/**
 * 메인 배너/팝업 관리 — 백엔드 cms 모듈(/admin/banners) 래핑.
 *
 * kind=hero(메인 슬라이드) / popup(홈 진입 팝업). 게시(published) 항목이 스토어프론트에 노출.
 * 이미지는 URL 입력(외부 스토리지 불필요).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TranslationFields,
  type TranslationFieldsHandle,
} from "@/components/ui/TranslationFields";

/** 백엔드 translation_settings.banner 와 같은 필드명이어야 저장된다. */
const BANNER_TR_FIELDS = [{ name: "title", label: "제목/문구", placeholder: "배너 문구" }];
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  type Banner,
  type BannerKind,
  type NoticeStatus,
} from "@/lib/api/cms";

const KIND_LABEL: Record<BannerKind, string> = {
  hero: "메인 슬라이드",
  popup: "홈 팝업",
};

export default function BannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const trRef = useRef<TranslationFieldsHandle>(null);
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState<BannerKind>("hero");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState<NoticeStatus>("published");

  const [delId, setDelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBanners(await listBanners());
    } catch (e) {
      toast.show((e as Error)?.message ?? "목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setEditId(null);
    setKind("hero");
    setTitle("");
    setImageUrl("");
    setLinkUrl("");
    setSortOrder(0);
    setStatus("published");
    setFormOpen(false);
  }

  function openEdit(b: Banner) {
    setEditId(b.id);
    setKind(b.kind);
    setTitle(b.title);
    setImageUrl(b.image_url);
    setLinkUrl(b.link_url ?? "");
    setSortOrder(b.sort_order);
    setStatus(b.status);
    setFormOpen(true);
  }

  async function save() {
    if (!title.trim() || !imageUrl.trim()) {
      toast.show("제목과 이미지 URL을 입력해 주세요.", "danger");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind,
        title: title.trim(),
        image_url: imageUrl.trim(),
        link_url: linkUrl.trim() || null,
        sort_order: sortOrder,
        status,
      };
      if (editId) await updateBanner(editId, payload);
      else await createBanner(payload);
      let trFailed: string | null = null;
      try {
        await trRef.current?.save();
      } catch (e) {
        trFailed = (e as Error).message;
      }
      toast.show(
        trFailed
          ? `저장했지만 번역 저장에 실패했습니다: ${trFailed}`
          : editId
            ? "수정했습니다."
            : "등록했습니다.",
        trFailed ? "danger" : "success"
      );
      reset();
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!delId) return;
    try {
      await deleteBanner(delId);
      toast.show("삭제했습니다.", "success");
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    } finally {
      setDelId(null);
    }
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        <div className="page-header">
          <div className="ph-l">
            <h1>배너 · 팝업</h1>
            <div className="ph-sub">
              메인 슬라이드/홈 팝업 관리 · 게시 항목이 스토어프론트 홈에 노출됩니다
            </div>
          </div>
          <div className="ph-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                reset();
                setFormOpen(true);
              }}
            >
              <Plus size={15} />
              배너 추가
            </button>
          </div>
        </div>

        {formOpen && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-pad">
              <div
                className="dsec-t"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                {editId ? "배너 수정" : "배너 추가"}
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "2px 8px" }}
                  onClick={reset}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <label className="field-l" style={{ width: 160 }}>
                    종류
                    <select
                      className="inp"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as BannerKind)}
                      data-testid="banner-kind"
                    >
                      <option value="hero">메인 슬라이드</option>
                      <option value="popup">홈 팝업</option>
                    </select>
                  </label>
                  <label className="field-l" style={{ width: 120 }}>
                    정렬순서
                    <input
                      className="inp"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="field-l" style={{ width: 120 }}>
                    게시 상태
                    <select
                      className="inp"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as NoticeStatus)}
                    >
                      <option value="published">게시</option>
                      <option value="draft">미게시</option>
                    </select>
                  </label>
                </div>
                {/* 배너 문구는 고객 화면에 보이는 글자 → 언어별 입력(2026-08-05) */}
                <TranslationFields
                  ref={trRef}
                  reference="banner"
                  referenceId={editId}
                  fields={BANNER_TR_FIELDS}
                  baseValues={{ title }}
                  onBaseChange={(_, value) => setTitle(value)}
                />
                <label className="field-l">
                  이미지 URL
                  <input
                    className="inp"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://…/banner.png"
                    data-testid="banner-image"
                  />
                </label>
                <label className="field-l">
                  링크 (선택)
                  <input
                    className="inp"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="/kr/store"
                  />
                </label>
                {imageUrl.trim() && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl.trim()}
                    alt="미리보기"
                    style={{
                      maxHeight: 120,
                      width: "auto",
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={save}
                  disabled={saving}
                  data-testid="banner-save"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
                <button type="button" className="btn secondary" onClick={reset}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-pad">
            <div className="dsec-t">배너 목록</div>
            {loading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : banners.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                등록된 배너가 없습니다.
              </div>
            ) : (
              banners.map((b) => (
                <div className="dline" key={b.id} data-testid="banner-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image_url}
                    alt={b.title}
                    style={{
                      width: 64,
                      height: 40,
                      objectFit: "cover",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />
                  <span className="dl-t" style={{ flex: 1 }}>
                    <b>{b.title}</b>
                    <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                      {KIND_LABEL[b.kind]} · 순서 {b.sort_order}
                      {b.link_url ? ` · ${b.link_url}` : ""}
                    </span>
                  </span>
                  <span
                    className={`badge ${b.status === "published" ? "success" : "neutral"}`}
                  >
                    <span className="bdot" />
                    {b.status === "published" ? "게시" : "미게시"}
                  </span>
                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      aria-label="배너 수정"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      aria-label="배너 삭제"
                      onClick={() => setDelId(b.id)}
                      data-testid="banner-delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!delId}
        title="배너를 삭제하시겠습니까?"
        message="삭제된 배너는 복구할 수 없습니다."
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}

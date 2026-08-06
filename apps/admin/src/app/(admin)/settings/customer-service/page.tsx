"use client";

/**
 * 고객센터 콘텐츠 관리 — 공지사항 + 자주 묻는 질문(FAQ)
 *
 * 백엔드 cms 모듈(/admin/notices, /admin/faqs) 래핑(@/lib/api/cms).
 * 게시(published) 콘텐츠가 스토어프론트 /고객센터 화면에 노출된다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TranslationFields,
  type TranslationFieldsHandle,
} from "@/components/ui/TranslationFields";
import { Plus, Pencil, Trash2, X } from "lucide-react";

/** 백엔드 translation_settings 의 필드명과 같아야 저장된다. */
const NOTICE_TR_FIELDS = [
  { name: "title", label: "제목", placeholder: "공지 제목" },
  { name: "body", label: "본문", multiline: true, placeholder: "공지 본문" },
];
const FAQ_TR_FIELDS = [
  { name: "question", label: "질문", placeholder: "질문" },
  { name: "answer", label: "답변", multiline: true, placeholder: "답변" },
];
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  FAQ_CATEGORIES,
  type Notice,
  type Faq,
  type NoticeStatus,
} from "@/lib/api/cms";

type TabId = "notices" | "faqs";
const TABS: { id: TabId; label: string }[] = [
  { id: "notices", label: "공지사항" },
  { id: "faqs", label: "자주 묻는 질문" },
];

function StatusBadge({ status }: { status: NoticeStatus }) {
  return (
    <span className={`badge ${status === "published" ? "success" : "neutral"}`}>
      <span className="bdot" />
      {status === "published" ? "게시" : "미게시"}
    </span>
  );
}

export default function CustomerServicePage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("notices");

  const [notices, setNotices] = useState<Notice[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);

  // 폼 상태 (생성/수정 공용). editId=null → 생성
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const noticeTrRef = useRef<TranslationFieldsHandle>(null);
  const faqTrRef = useRef<TranslationFieldsHandle>(null);
  const [saving, setSaving] = useState(false);

  // 공지 폼 필드
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [nPinned, setNPinned] = useState(false);
  const [nStatus, setNStatus] = useState<NoticeStatus>("published");

  // FAQ 폼 필드
  const [fCategory, setFCategory] = useState<string>(FAQ_CATEGORIES[0]);
  const [fQuestion, setFQuestion] = useState("");
  const [fAnswer, setFAnswer] = useState("");
  const [fSort, setFSort] = useState(0);
  const [fStatus, setFStatus] = useState<NoticeStatus>("published");

  // 삭제 확인
  const [delTarget, setDelTarget] = useState<{ kind: TabId; id: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ns, fs] = await Promise.all([listNotices(), listFaqs()]);
      setNotices(ns);
      setFaqs(fs);
    } catch (e) {
      toast.show((e as Error)?.message ?? "목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditId(null);
    setNTitle("");
    setNBody("");
    setNPinned(false);
    setNStatus("published");
    setFCategory(FAQ_CATEGORIES[0]);
    setFQuestion("");
    setFAnswer("");
    setFSort(0);
    setFStatus("published");
    setFormOpen(false);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function openEditNotice(n: Notice) {
    setEditId(n.id);
    setNTitle(n.title);
    setNBody(n.body);
    setNPinned(n.pinned);
    setNStatus(n.status);
    setFormOpen(true);
  }

  function openEditFaq(f: Faq) {
    setEditId(f.id);
    setFCategory(f.category);
    setFQuestion(f.question);
    setFAnswer(f.answer);
    setFSort(f.sort_order);
    setFStatus(f.status);
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (tab === "notices") {
        if (!nTitle.trim() || !nBody.trim()) {
          toast.show("제목과 본문을 입력해 주세요.", "danger");
          setSaving(false);
          return;
        }
        const payload = {
          title: nTitle.trim(),
          body: nBody.trim(),
          pinned: nPinned,
          status: nStatus,
        };
        if (editId) await updateNotice(editId, payload);
        else await createNotice(payload);
      } else {
        if (!fQuestion.trim() || !fAnswer.trim()) {
          toast.show("질문과 답변을 입력해 주세요.", "danger");
          setSaving(false);
          return;
        }
        const payload = {
          category: fCategory,
          question: fQuestion.trim(),
          answer: fAnswer.trim(),
          sort_order: fSort,
          status: fStatus,
        };
        if (editId) await updateFaq(editId, payload);
        else await createFaq(payload);
      }
      // 번역은 원본과 별도 테이블 — 따로 저장하고 실패를 구분해 알린다.
      let trFailed: string | null = null;
      try {
        if (tab === "notices") await noticeTrRef.current?.save();
        else await faqTrRef.current?.save();
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
      resetForm();
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    try {
      if (delTarget.kind === "notices") await deleteNotice(delTarget.id);
      else await deleteFaq(delTarget.id);
      toast.show("삭제했습니다.", "success");
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    } finally {
      setDelTarget(null);
    }
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        <div className="page-header">
          <div className="ph-l">
            <h1>고객센터 콘텐츠</h1>
            <div className="ph-sub">
              공지사항·FAQ 관리 · 게시(published) 항목이 스토어프론트 고객센터에
              노출됩니다
            </div>
          </div>
          <div className="ph-actions">
            <button type="button" className="btn primary" onClick={openCreate}>
              <Plus size={15} />
              {tab === "notices" ? "공지 추가" : "FAQ 추가"}
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn ${tab === t.id ? "primary" : "secondary"}`}
              onClick={() => {
                setTab(t.id);
                resetForm();
              }}
              data-testid={`tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 생성/수정 폼 */}
        {formOpen && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-pad">
              <div
                className="dsec-t"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                {tab === "notices"
                  ? editId
                    ? "공지 수정"
                    : "공지 추가"
                  : editId
                    ? "FAQ 수정"
                    : "FAQ 추가"}
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "2px 8px" }}
                  onClick={resetForm}
                >
                  <X size={14} />
                </button>
              </div>

              {tab === "notices" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* 공지는 고객 화면에 그대로 보이는 글자 → 언어별 입력(2026-08-05).
                      신규 등록(editId 없음)에는 붙일 대상 id 가 없어 기본 언어만 받는다. */}
                  <TranslationFields
                    ref={noticeTrRef}
                    reference="notice"
                    referenceId={editId}
                    fields={NOTICE_TR_FIELDS}
                    baseValues={{ title: nTitle, body: nBody }}
                    onBaseChange={(name, value) => {
                      if (name === "title") setNTitle(value)
                      else setNBody(value)
                    }}
                  />
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <label
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={nPinned}
                        onChange={(e) => setNPinned(e.target.checked)}
                        data-testid="notice-pinned"
                      />
                      상단 고정
                    </label>
                    <label
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      게시 상태
                      <select
                        className="inp"
                        style={{ width: 120 }}
                        value={nStatus}
                        onChange={(e) =>
                          setNStatus(e.target.value as NoticeStatus)
                        }
                        data-testid="notice-status"
                      >
                        <option value="published">게시</option>
                        <option value="draft">미게시</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <label className="field-l" style={{ flex: 1 }}>
                      분류
                      <select
                        className="inp"
                        value={fCategory}
                        onChange={(e) => setFCategory(e.target.value)}
                        data-testid="faq-category"
                      >
                        {FAQ_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-l" style={{ width: 120 }}>
                      정렬순서
                      <input
                        className="inp"
                        type="number"
                        value={fSort}
                        onChange={(e) => setFSort(Number(e.target.value) || 0)}
                        data-testid="faq-sort"
                      />
                    </label>
                    <label className="field-l" style={{ width: 120 }}>
                      게시 상태
                      <select
                        className="inp"
                        value={fStatus}
                        onChange={(e) =>
                          setFStatus(e.target.value as NoticeStatus)
                        }
                        data-testid="faq-status"
                      >
                        <option value="published">게시</option>
                        <option value="draft">미게시</option>
                      </select>
                    </label>
                  </div>
                  <TranslationFields
                    ref={faqTrRef}
                    reference="faq"
                    referenceId={editId}
                    fields={FAQ_TR_FIELDS}
                    baseValues={{ question: fQuestion, answer: fAnswer }}
                    onBaseChange={(name, value) => {
                      if (name === "question") setFQuestion(value)
                      else setFAnswer(value)
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={save}
                  disabled={saving}
                  data-testid="cms-save"
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
                <button type="button" className="btn secondary" onClick={resetForm}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="card">
          <div className="card-pad">
            <div className="dsec-t">
              {tab === "notices" ? "공지 목록" : "FAQ 목록"}
            </div>

            {loading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : tab === "notices" ? (
              notices.length === 0 ? (
                <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                  등록된 공지가 없습니다.
                </div>
              ) : (
                notices.map((n) => (
                  <div className="dline" key={n.id} data-testid="notice-row">
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>
                        {n.pinned && "📌 "}
                        {n.title}
                      </b>
                      <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                        {new Date(n.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </span>
                    <StatusBadge status={n.status} />
                    <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        aria-label="공지 수정"
                        onClick={() => openEditNotice(n)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        aria-label="공지 삭제"
                        onClick={() => setDelTarget({ kind: "notices", id: n.id })}
                        data-testid="notice-delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                ))
              )
            ) : faqs.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                등록된 FAQ가 없습니다.
              </div>
            ) : (
              faqs.map((f) => (
                <div className="dline" key={f.id} data-testid="faq-row">
                  <span className="dl-t" style={{ flex: 1 }}>
                    <b>
                      [{f.category}] {f.question}
                    </b>
                    <span style={{ color: "var(--text-3)", fontSize: 12 }}>
                      {f.answer}
                    </span>
                  </span>
                  <StatusBadge status={f.status} />
                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      aria-label="FAQ 수정"
                      onClick={() => openEditFaq(f)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      aria-label="FAQ 삭제"
                      onClick={() => setDelTarget({ kind: "faqs", id: f.id })}
                      data-testid="faq-delete"
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
        open={!!delTarget}
        title="삭제하시겠습니까?"
        message="삭제된 콘텐츠는 복구할 수 없습니다."
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}

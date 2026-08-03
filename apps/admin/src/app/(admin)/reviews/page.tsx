"use client";

/**
 * 리뷰·문의 — 프로토타입(admin-screen-misc.js SC.reviews/_after_reviews) 1:1 이식.
 *  - 4탭(1:1 문의/상품 Q&A/리뷰 관리/신고·블라인드) + 카운트 = 실데이터.
 *  - 좌: queue-list, 우: 문의 상세/답변 패널 (클릭 선택 → primary-weak 하이라이트).
 *  - 데이터 = 실 Medusa custom 모듈(/admin/reviews).
 */
import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Truck,
  RotateCcw,
  Star,
  ShieldAlert,
} from "lucide-react";
import {
  listReviews,
  getReview,
  setReviewStatus,
  replyReview,
  type ReviewItem,
  type ReviewStatus,
} from "@/lib/api/reviews";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function I(name: string, size = 16): React.ReactNode {
  const cls = `shrink-0`;
  if (name === "truck") return <Truck size={size} className={cls} />;
  if (name === "refund") return <RotateCcw size={size} className={cls} />;
  if (name === "message") return <MessageSquare size={size} className={cls} />;
  if (name === "star") return <Star size={size} className={cls} />;
  if (name === "shield") return <ShieldAlert size={size} className={cls} />;
  return <MessageSquare size={size} className={cls} />;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** 문의 type/title 기준으로 아이콘 이름을 결정 */
function iconName(r: ReviewItem): string {
  if (r.type === "review") return "star";
  const t = (r.title ?? "").toLowerCase();
  if (t.includes("배송")) return "truck";
  if (t.includes("교환") || t.includes("반품")) return "refund";
  return "message";
}

/** 아이콘 색상 — 대기 = amber, 그 외 = gray */
function iconTone(r: ReviewItem): string {
  return r.status === "pending" ? "amber" : "gray";
}

/** status → badge 클래스 */
const STATUS_BADGE: Record<ReviewStatus, { label: string; cls: string }> = {
  pending: { label: "답변대기", cls: "badge warning" },
  published: { label: "공개", cls: "badge success" },
  hidden: { label: "숨김(블라인드)", cls: "badge neutral" },
  answered: { label: "답변완료", cls: "badge success" },
};

function Badge({ status }: { status: ReviewStatus }) {
  const b = STATUS_BADGE[status];
  return (
    <span className={b.cls}>
      <span className="bdot" />
      {b.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* tab type                                                             */
/* ------------------------------------------------------------------ */
type Tab = "inquiry" | "qna" | "review" | "blind";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function Page() {
  const [tab, setTab] = useState<Tab>("inquiry");
  const [rows, setRows] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [langTab, setLangTab] = useState<"ko" | "en" | "jp">("ko");

  /* 카운트 — 탭별 실데이터 카운트 (최초 마운트 때 병렬 조회) */
  const [counts, setCounts] = useState<Record<Tab, number>>({
    inquiry: 0,
    qna: 0,
    review: 0,
    blind: 0,
  });

  /* 카운트 초기 로드 — 1:1 문의(product_id 없음) / 상품 Q&A(product_id 있음) 구분 */
  useEffect(() => {
    Promise.allSettled([
      listReviews({ type: "inquiry", limit: 200 }),
      listReviews({ type: "review", limit: 1 }),
      Promise.all([
        listReviews({ type: "review", status: "hidden", limit: 1 }),
        listReviews({ type: "inquiry", status: "hidden", limit: 1 }),
      ]),
    ]).then((results) => {
      const inquiries =
        results[0].status === "fulfilled" ? results[0].value.reviews : [];
      const inquiry = inquiries.filter((r) => !r.product_id).length;
      const qna = inquiries.filter((r) => !!r.product_id).length;
      const review =
        results[1].status === "fulfilled" ? results[1].value.count : 0;
      const blindPair =
        results[2].status === "fulfilled" ? results[2].value : [{ count: 0 }, { count: 0 }];
      const blind =
        (blindPair as [{ count: number }, { count: number }])[0].count +
        (blindPair as [{ count: number }, { count: number }])[1].count;
      setCounts({ inquiry, qna, review, blind });
    });
  }, []);

  /* 목록 로드 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "blind") {
        const [r, i] = await Promise.all([
          listReviews({ type: "review", status: "hidden", limit: 100 }),
          listReviews({ type: "inquiry", status: "hidden", limit: 100 }),
        ]);
        const merged = [...r.reviews, ...i.reviews];
        setRows(merged);
        // 프로토타입 정합 — 첫 항목 자동 선택 (우측 답변 패널 항상 노출)
        setSelected(merged[0] ?? null);
        setReplyText(merged[0]?.reply ?? "");
      } else if (tab === "review") {
        const { reviews } = await listReviews({ type: "review", limit: 100 });
        setRows(reviews);
        setSelected(reviews[0] ?? null);
        setReplyText(reviews[0]?.reply ?? "");
      } else {
        // inquiry(1:1 문의) / qna(상품 Q&A) 모두 type=inquiry — product_id 유무로 구분
        const { reviews } = await listReviews({ type: "inquiry", limit: 200 });
        const filtered =
          tab === "qna"
            ? reviews.filter((r) => !!r.product_id) // 상품 Q&A = 상품 연결 문의
            : reviews.filter((r) => !r.product_id); // 1:1 문의 = 일반 문의
        setRows(filtered);
        setSelected(filtered[0] ?? null);
        setReplyText(filtered[0]?.reply ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  /* 행 클릭 → 상세 로드 */
  async function selectRow(r: ReviewItem) {
    try {
      const { review } = await getReview(r.id);
      setSelected(review);
      setReplyText(review.reply ?? "");
    } catch {
      setSelected(r);
      setReplyText(r.reply ?? "");
    }
  }

  /* 상태 변경 */
  async function changeStatus(status: ReviewStatus) {
    if (!selected) return;
    setBusy(true);
    try {
      const { review } = await setReviewStatus(selected.id, status);
      setSelected(review);
      await load();
    } finally {
      setBusy(false);
    }
  }

  /* 답변 등록 */
  async function submitReply() {
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    try {
      const { review } = await replyReview(selected.id, replyText.trim());
      setSelected(review);
      await load();
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* render                                                            */
  /* ---------------------------------------------------------------- */
  const TAB_DEFS: [Tab, string][] = [
    ["inquiry", "1:1 문의"],
    ["qna", "상품 Q&A"],
    ["review", "리뷰 관리"],
    ["blind", "신고·블라인드"],
  ];

  return (
    <div className="scr">
      {/* ── 페이지 헤더 ── */}
      <div className="page-header">
        <div className="ph-l">
          <h1>리뷰 · 문의</h1>
          <div className="ph-sub">
            미답변 문의 {counts.inquiry}건 · 블라인드 {counts.blind}건
          </div>
        </div>
        <div className="ph-actions">
          {/* 동작하지 않던 버튼(2026-08-03) — 눌러도 반응이 없어 고장으로 오해되므로 비활성 + 사유를 표시한다. */}
          <button className="btn" type="button"
            disabled
            title="자주 쓰는 답변 템플릿은 준비 중입니다."
          >
            {I("message", 16)}
            <span>자주 쓰는 답변</span>
          </button>
        </div>
      </div>

      {/* ── 세그 탭 ── */}
      <div className="card mb16">
        <div className="segtabs">
          {TAB_DEFS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`segtab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
              <span className="cnt">{counts[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 신고·블라인드 탭 전용 안내 ── */}
      {tab === "blind" && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            background: "var(--warning-weak)",
            color: "var(--text-2)",
            borderRadius: "var(--radius)",
            padding: "10px 14px",
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          <ShieldAlert size={15} style={{ marginTop: 1, flexShrink: 0, color: "var(--warning)" }} />
          <span>
            사용자 신고(report) 접수 큐는 차기 연동 예정입니다. 현재는 운영자가
            숨김(블라인드) 처리한 리뷰·문의를 실데이터로 표시합니다. 행을 열어 공개로
            되돌릴 수 있습니다.
          </span>
        </div>
      )}

      {/* ── 2-col 레이아웃 ── */}
      <div className="dash-grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT: queue-list */}
        <div className="card">
          <div className="queue-list">
            {loading ? (
              <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : rows.length === 0 ? (
              <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
                항목이 없습니다.
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="queue-row"
                  style={
                    selected?.id === r.id
                      ? { background: "var(--primary-weak)" }
                      : undefined
                  }
                  onClick={() => selectRow(r)}
                >
                  <span className={`q-ic ${iconTone(r)}`}>
                    {I(iconName(r), 16)}
                  </span>
                  <span className="q-l">
                    <b>{r.title ?? "(제목 없음)"}</b>
                    <span>
                      {r.product_title ?? "—"} · {r.author_name ?? "—"} ·{" "}
                      {fmtDate(r.created_at)}
                    </span>
                  </span>
                  <Badge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: 문의 상세/답변 */}
        <div className="card">
          {selected ? (
            <>
              <div className="card-h">
                <h3>
                  {selected.type === "inquiry" ? "문의 상세 / 답변" : "리뷰 상세 / 답변"}
                </h3>
                <span className="ch-r">
                  <Badge status={selected.status} />
                </span>
              </div>
              <div className="card-pad">
                {/* 질문 블록 */}
                <div
                  style={{
                    padding: 13,
                    background: "var(--surface-2)",
                    borderRadius: 10,
                    marginBottom: 14,
                  }}
                >
                  <div
                    className="muted"
                    style={{ fontSize: 12, marginBottom: 6, color: "var(--text-3)" }}
                  >
                    {selected.product_title ?? "—"} · {selected.author_name ?? "—"} ·{" "}
                    {fmtDate(selected.created_at)}
                  </div>
                  {selected.type === "review" && selected.rating != null && (
                    <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          fill={i < (selected.rating ?? 0) ? "var(--warning)" : "none"}
                          style={{
                            color:
                              i < (selected.rating ?? 0) ? "var(--warning)" : "var(--text-3)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 14 }}>
                    {selected.title ? (
                      <b style={{ display: "block", marginBottom: 4 }}>{selected.title}</b>
                    ) : null}
                    {selected.content}
                  </div>
                </div>

                {/* 기존 답변 */}
                {selected.reply ? (
                  <div
                    style={{
                      padding: 12,
                      background: "var(--primary-weak)",
                      borderRadius: 10,
                      marginBottom: 14,
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selected.reply}
                  </div>
                ) : null}

                {/* 답변 작성 */}
                <div className="frow">
                  <span className="field-l">답변 작성</span>
                  <div className="lang-tabs">
                    {(
                      [
                        ["ko", "한국어"],
                        ["en", "EN"],
                        ["jp", "JP"],
                      ] as const
                    ).map(([lk, ll]) => (
                      <span
                        key={lk}
                        className={`lang-tab${langTab === lk ? " active" : ""}`}
                        onClick={() => setLangTab(lk)}
                      >
                        {ll}
                      </span>
                    ))}
                  </div>
                  <textarea
                    className="inp"
                    placeholder="답변을 입력하세요 — 자주 쓰는 답변 불러오기 가능"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => changeStatus("hidden")}
                  >
                    보류
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy || !replyText.trim()}
                    onClick={submitReply}
                  >
                    {selected.reply ? "답변 수정" : "답변 등록"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
              왼쪽 목록에서 항목을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

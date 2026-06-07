"use client";

/**
 * 상품 통계·홈 큐레이션 — d3 t010_상품통계큐레이션 (갭B 어드민 화면).
 *
 * Medusa 코어에 분석/큐레이션 API 없음 → 커스텀 product-curation 모듈 4종 route 호출.
 * 로직 재구현 없이 lib/api/product-curation.ts 래퍼만 사용한다.
 *
 *  탭 구성:
 *   1) 상품통계   : 조회수(view-counts) / 위시(wishlists) 상위 집계 — 상품명은 listProducts 로 매핑.
 *   2) 인기검색어 : popular-terms 목록(금칙어 제외) + 검색어 집계 기록.
 *   3) 금칙어     : banned-words 목록 + 등록(scope 선택) + 삭제.
 *   4) 큐레이션   : 베스트(조회수 상위) / 신상품(최신 등록) 섹션 미리보기.
 *                   ※ 큐레이션 저장 전용 백엔드 route 없음 → 기존 데이터 기반 read-only 미리보기.
 *
 * 화면 클래스(.scr / .page-header / .segtabs / .card / .dt …)는 기존 어드민 컨벤션 verbatim.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Heart, Search, Plus, Trash2, RefreshCw, Star, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui";
import {
  getViewCounts,
  getWishlists,
  getPopularTerms,
  recordSearch,
  getBannedWords,
  addBannedWord,
  removeBannedWord,
  listCurationProducts,
  buildProductTitleMap,
  type ViewCountItem,
  type WishlistItem,
  type PopularTermItem,
  type BannedWord,
  type BannedWordScope,
  type CurationProduct,
} from "@/lib/api/product-curation";

/* ============================================================
   상수 / 헬퍼
   ============================================================ */
type ActiveTab = "stats" | "terms" | "banned" | "curation";

const TABS: { value: ActiveTab; label: string }[] = [
  { value: "stats", label: "상품 통계" },
  { value: "terms", label: "인기검색어 관리" },
  { value: "banned", label: "금칙어 관리" },
  { value: "curation", label: "큐레이션 섹션" },
];

/** 금칙어 scope → 라벨 */
const SCOPE_LABEL: Record<BannedWordScope, string> = {
  all: "전체",
  search: "검색어",
  product_name: "상품명",
  review: "리뷰",
};
const SCOPE_OPTIONS: BannedWordScope[] = ["all", "search", "product_name", "review"];

const BEST_LIMIT = 8; // 베스트 큐레이션 노출 개수(조회수 상위)
const NEW_LIMIT = 8; // 신상품 큐레이션 노출 개수(최신 등록)

/* ============================================================
   Page Component
   ============================================================ */
export default function ProductCurationPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("stats");

  /* ── 공통: 상품명 매핑(조회수/위시/큐레이션 공용) ── */
  const [products, setProducts] = useState<CurationProduct[]>([]);
  const titleMap = useMemo(() => buildProductTitleMap(products), [products]);
  const productName = useCallback(
    (id: string) => titleMap[id] ?? id,
    [titleMap]
  );

  /* ── 상품통계 탭 ── */
  const [viewCounts, setViewCounts] = useState<ViewCountItem[]>([]);
  const [wishlists, setWishlists] = useState<WishlistItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  /* ── 인기검색어 탭 ── */
  const [terms, setTerms] = useState<PopularTermItem[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [termBusy, setTermBusy] = useState(false);

  /* ── 금칙어 탭 ── */
  const [banned, setBanned] = useState<BannedWord[]>([]);
  const [bannedLoading, setBannedLoading] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newScope, setNewScope] = useState<BannedWordScope>("all");
  const [bannedBusy, setBannedBusy] = useState(false);

  /* ============================================================
     데이터 로드
     ============================================================ */
  /** 상품명 매핑용 상품 목록(1회 로드, 모든 탭 공용). */
  const loadProducts = useCallback(async () => {
    try {
      const { products } = await listCurationProducts(100);
      setProducts(products);
    } catch (e) {
      toast.show(`상품 목록 조회 실패: ${(e as Error).message}`, "danger");
    }
  }, [toast]);

  /** 상품통계 — 조회수 + 위시 동시 집계. */
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [vc, wl] = await Promise.all([getViewCounts(20), getWishlists(20)]);
      setViewCounts(vc.view_counts);
      setWishlists(wl.wishlists);
    } catch (e) {
      toast.show(`통계 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  /** 인기검색어 목록(금칙어 제외). */
  const loadTerms = useCallback(async () => {
    setTermsLoading(true);
    try {
      const { popular_terms } = await getPopularTerms(20);
      setTerms(popular_terms);
    } catch (e) {
      toast.show(`인기검색어 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setTermsLoading(false);
    }
  }, [toast]);

  /** 금칙어 목록. */
  const loadBanned = useCallback(async () => {
    setBannedLoading(true);
    try {
      const { banned_words } = await getBannedWords();
      setBanned(banned_words);
    } catch (e) {
      toast.show(`금칙어 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBannedLoading(false);
    }
  }, [toast]);

  // 최초 진입 — 상품명 맵 + 통계
  useEffect(() => {
    void loadProducts();
    void loadStats();
  }, [loadProducts, loadStats]);

  // 탭 전환 시 해당 탭 데이터 lazy 로드
  useEffect(() => {
    if (activeTab === "terms") void loadTerms();
    if (activeTab === "banned") void loadBanned();
    if (activeTab === "curation") {
      void loadStats(); // 베스트(조회수) 재사용
    }
  }, [activeTab, loadTerms, loadBanned, loadStats]);

  /* ============================================================
     액션
     ============================================================ */
  /** 인기검색어 집계 기록(관리자 수동). */
  const submitTerm = useCallback(async () => {
    const term = newTerm.trim();
    if (!term) {
      toast.show("검색어를 입력하세요.", "danger");
      return;
    }
    setTermBusy(true);
    try {
      await recordSearch(term);
      setNewTerm("");
      await loadTerms();
      toast.show(`'${term}' 검색어를 집계에 기록했습니다.`);
    } catch (e) {
      toast.show(`검색어 기록 실패: ${(e as Error).message}`, "danger");
    } finally {
      setTermBusy(false);
    }
  }, [newTerm, loadTerms, toast]);

  /** 금칙어 등록. */
  const submitBanned = useCallback(async () => {
    const word = newWord.trim();
    if (!word) {
      toast.show("금칙어를 입력하세요.", "danger");
      return;
    }
    setBannedBusy(true);
    try {
      await addBannedWord(word, newScope);
      setNewWord("");
      setNewScope("all");
      await loadBanned();
      toast.show(`금칙어 '${word}'를 등록했습니다.`);
    } catch (e) {
      // 백엔드 409(중복) 도 "요청 실패: 409" 형태로 전달됨
      toast.show(`금칙어 등록 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBannedBusy(false);
    }
  }, [newWord, newScope, loadBanned, toast]);

  /** 금칙어 삭제. */
  const deleteBanned = useCallback(
    async (word: string) => {
      setBannedBusy(true);
      try {
        await removeBannedWord(word);
        await loadBanned();
        toast.show(`금칙어 '${word}'를 삭제했습니다.`);
      } catch (e) {
        toast.show(`금칙어 삭제 실패: ${(e as Error).message}`, "danger");
      } finally {
        setBannedBusy(false);
      }
    },
    [loadBanned, toast]
  );

  /* ============================================================
     큐레이션 파생 데이터(read-only 미리보기)
     ============================================================ */
  // 베스트 = 조회수 상위, 신상품 = 최신 등록(listCurationProducts 가 -created_at 정렬)
  const bestProducts = useMemo(
    () => viewCounts.slice(0, BEST_LIMIT),
    [viewCounts]
  );
  const newProducts = useMemo(
    () => products.slice(0, NEW_LIMIT),
    [products]
  );

  /* ============================================================
     JSX
     ============================================================ */
  return (
    <div className="scr">
      {/* ── 페이지 헤더 ── */}
      <div className="page-header">
        <div className="ph-l">
          <h1>상품 통계·큐레이션</h1>
          <div className="ph-sub">조회수·위시 집계 · 인기검색어 · 금칙어 · 홈 큐레이션 섹션</div>
        </div>
        <div className="ph-actions">
          <button
            className="btn"
            type="button"
            onClick={() => {
              void loadProducts();
              if (activeTab === "stats" || activeTab === "curation") void loadStats();
              if (activeTab === "terms") void loadTerms();
              if (activeTab === "banned") void loadBanned();
            }}
          >
            <RefreshCw size={16} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* ── 탭 전환 ── */}
      <div className="segtabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`segtab${activeTab === t.value ? " active" : ""}`}
            onClick={() => setActiveTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ 상품 통계 탭 ══════════════════════════ */}
      {activeTab === "stats" && (
        <div className="dash-grid2">
          {/* 조회수 상위 */}
          <div className="card">
            <div className="card-h">
              <h3>
                <Eye size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                조회수 상위 상품
              </h3>
              <span className="ch-sub">view-counts · count DESC</span>
            </div>
            <div className="table-wrap">
              {statsLoading ? (
                <div className="empty"><p>불러오는 중…</p></div>
              ) : viewCounts.length === 0 ? (
                <div className="empty">
                  <h4>조회수 데이터 없음</h4>
                  <p>아직 집계된 상품 조회 기록이 없습니다.</p>
                </div>
              ) : (
                <table className="dt">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th>상품</th>
                      <th className="num">조회수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewCounts.map((v, i) => (
                      <tr key={v.product_id}>
                        <td className="muted">{i + 1}</td>
                        <td>
                          <b>{productName(v.product_id)}</b>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>{v.product_id}</div>
                        </td>
                        <td className="num strong">{v.count.toLocaleString("ko-KR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 위시 상위 */}
          <div className="card">
            <div className="card-h">
              <h3>
                <Heart size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                위시(찜) 상위 상품
              </h3>
              <span className="ch-sub">wishlists · wishCount DESC</span>
            </div>
            <div className="table-wrap">
              {statsLoading ? (
                <div className="empty"><p>불러오는 중…</p></div>
              ) : wishlists.length === 0 ? (
                <div className="empty">
                  <h4>위시 데이터 없음</h4>
                  <p>아직 찜한 상품 기록이 없습니다.</p>
                </div>
              ) : (
                <table className="dt">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th>상품</th>
                      <th className="num">위시 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wishlists.map((w, i) => (
                      <tr key={w.product_id}>
                        <td className="muted">{i + 1}</td>
                        <td>
                          <b>{productName(w.product_id)}</b>
                          <div style={{ fontSize: 11, color: "var(--text-3)" }}>{w.product_id}</div>
                        </td>
                        <td className="num strong">{w.wishCount.toLocaleString("ko-KR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ 인기검색어 탭 ══════════════════════════ */}
      {activeTab === "terms" && (
        <div className="card">
          <div className="card-h">
            <h3>
              <Search size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              인기 검색어
            </h3>
            <span className="ch-sub">금칙어 제외 · count DESC</span>
          </div>

          {/* 검색어 집계 기록 폼 */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <input
              className="inp"
              style={{ flex: 1 }}
              placeholder="검색어 입력 → 집계 기록(관리자/테스트)"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submitTerm(); }}
            />
            <button className="btn primary" type="button" disabled={termBusy} onClick={() => void submitTerm()}>
              <Plus size={16} /> 집계 기록
            </button>
          </div>

          <div className="table-wrap">
            {termsLoading ? (
              <div className="empty"><p>불러오는 중…</p></div>
            ) : terms.length === 0 ? (
              <div className="empty">
                <h4>인기 검색어 없음</h4>
                <p>집계된 검색어가 없거나 모두 금칙어로 제외되었습니다.</p>
              </div>
            ) : (
              <table className="dt">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>검색어</th>
                    <th className="num">검색 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t, i) => (
                    <tr key={t.term}>
                      <td className="muted">{i + 1}</td>
                      <td><b>{t.term}</b></td>
                      <td className="num strong">{t.count.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ 금칙어 탭 ══════════════════════════ */}
      {activeTab === "banned" && (
        <div className="card">
          <div className="card-h">
            <h3>금칙어 관리</h3>
            <span className="ch-sub">검색어·상품명·리뷰 차단 단어</span>
          </div>

          {/* 금칙어 등록 폼 */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <input
              className="inp"
              style={{ flex: 1 }}
              placeholder="금칙어 입력"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submitBanned(); }}
            />
            <select
              className="inp select-like"
              style={{ width: 140 }}
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as BannedWordScope)}
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
              ))}
            </select>
            <button className="btn primary" type="button" disabled={bannedBusy} onClick={() => void submitBanned()}>
              <Plus size={16} /> 등록
            </button>
          </div>

          <div className="table-wrap">
            {bannedLoading ? (
              <div className="empty"><p>불러오는 중…</p></div>
            ) : banned.length === 0 ? (
              <div className="empty">
                <h4>등록된 금칙어 없음</h4>
                <p>차단할 단어를 등록하세요.</p>
              </div>
            ) : (
              <table className="dt">
                <thead>
                  <tr>
                    <th>금칙어</th>
                    <th>적용 범위</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {banned.map((b) => (
                    <tr key={b.id}>
                      <td><b>{b.word}</b></td>
                      <td>
                        <span className="badge neutral">
                          <span className="bdot" />
                          {SCOPE_LABEL[b.scope] ?? b.scope}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn sm danger"
                          disabled={bannedBusy}
                          onClick={() => void deleteBanned(b.word)}
                          title="금칙어 삭제"
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════ 큐레이션 섹션 탭 ══════════════════════════ */}
      {activeTab === "curation" && (
        <>
          <div className="notice" style={{ marginBottom: 16 }}>
            홈 큐레이션 섹션 미리보기입니다. 베스트 = 조회수 상위, 신상품 = 최신 등록 순으로
            기존 집계 데이터를 기반으로 구성합니다. (섹션 저장 전용 백엔드 route 가 없어 현재는 읽기 전용 미리보기)
          </div>
          <div className="dash-grid2">
            {/* 베스트 섹션 */}
            <div className="card">
              <div className="card-h">
                <h3>
                  <Star size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                  베스트 (조회수 상위)
                </h3>
                <span className="ch-sub">상위 {BEST_LIMIT}개</span>
              </div>
              <div className="table-wrap">
                {statsLoading ? (
                  <div className="empty"><p>불러오는 중…</p></div>
                ) : bestProducts.length === 0 ? (
                  <div className="empty">
                    <h4>베스트 데이터 없음</h4>
                    <p>조회수 집계가 쌓이면 자동 구성됩니다.</p>
                  </div>
                ) : (
                  <table className="dt">
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}>순위</th>
                        <th>상품</th>
                        <th className="num">조회수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestProducts.map((v, i) => (
                        <tr key={v.product_id}>
                          <td className="muted">{i + 1}</td>
                          <td><b>{productName(v.product_id)}</b></td>
                          <td className="num strong">{v.count.toLocaleString("ko-KR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* 신상품 섹션 */}
            <div className="card">
              <div className="card-h">
                <h3>
                  <Sparkles size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                  신상품 (최신 등록)
                </h3>
                <span className="ch-sub">최근 {NEW_LIMIT}개</span>
              </div>
              <div className="table-wrap">
                {newProducts.length === 0 ? (
                  <div className="empty">
                    <h4>신상품 없음</h4>
                    <p>등록된 상품이 없습니다.</p>
                  </div>
                ) : (
                  <table className="dt">
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}>순위</th>
                        <th>상품</th>
                        <th>등록일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProducts.map((p, i) => (
                        <tr key={p.id}>
                          <td className="muted">{i + 1}</td>
                          <td><b>{p.title}</b></td>
                          <td className="muted">
                            {(() => {
                              try {
                                return new Date(p.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
                              } catch { return p.created_at; }
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

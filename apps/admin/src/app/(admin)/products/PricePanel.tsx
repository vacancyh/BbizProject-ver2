"use client";

/**
 * PricePanel — t007 가격관리 UI
 *
 * 역할:
 *  - 변형별 3가지 가격 관리: 원가(cost) · 정상가(compare_at) · 판매가(price)
 *  - 가격 입력·저장 (변형별 개별 저장)
 *  - 정상가 > 판매가 시 할인율(%) 자동 계산 표시
 *  - 원가 마진율 자동 계산 표시 (판매가 - 원가 / 판매가)
 *
 * 데이터 연동: Medusa REST
 *  - GET  /admin/products/:id → variants[].prices (VariantPrice 배열)
 *  - POST /admin/products/:id/variants/:vid — prices 배열 업데이트
 *
 * Medusa v2 가격 구조:
 *  - prices 배열 = [{ amount, currency_code }]
 *  - 원가(cost)·정상가(compare_at_price) = variant 필드 or metadata 활용
 *    TODO(사장님결정): Medusa v2 에서 compare_at_price / cost_price 는 variant 직접 필드 존재 여부 확인 필요.
 *    현재 구현: metadata.cost_price, metadata.compare_at_price 로 fallback 처리.
 *    Medusa v2 공식 variant 필드 확인 후 직접 필드 사용으로 교체 권장.
 */

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";
import {
  representativePrice,
  type ProductDetail,
  type ProductVariant,
  type VariantPrice,
} from "@/lib/api/products";

/* ============================================================
   타입 확장 — Medusa v2 variant 에 cost/compare_at 필드 대응
   ============================================================ */
type VariantWithPricing = ProductVariant & {
  /** Medusa v2 variant 레벨 원가 필드 (단위: 최소화폐단위 = 원) */
  // TODO(사장님결정): Medusa v2 cost_price 필드명 확인. 없으면 metadata 활용.
  cost_price?: number | null;
  /** Medusa v2 variant 레벨 정상가 (비교가) 필드 */
  // TODO(사장님결정): Medusa v2 compare_at_price 필드명 확인.
  compare_at_price?: number | null;
  /** 메타데이터 fallback */
  metadata?: Record<string, unknown> | null;
};

/* ============================================================
   가격 3종 드래프트
   ============================================================ */
type PriceDraft = {
  /** 판매가 (KRW, 원) */
  salePrice: string;
  /** 정상가 (compare_at, KRW, 원) — 정상가 > 판매가 → 할인가 표시 */
  compareAtPrice: string;
  /** 원가 (cost, KRW, 원) — 마진율 계산용 */
  costPrice: string;
};

/* ============================================================
   헬퍼: 숫자 파싱 (빈 문자 → null)
   ============================================================ */
function parseAmount(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ============================================================
   헬퍼: 할인율 계산
   ============================================================ */
function discountRate(salePrice: number, compareAtPrice: number): number {
  if (compareAtPrice <= 0 || salePrice >= compareAtPrice) return 0;
  return Math.round(((compareAtPrice - salePrice) / compareAtPrice) * 100);
}

/* ============================================================
   헬퍼: 마진율 계산
   ============================================================ */
function marginRate(salePrice: number, costPrice: number): number {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / salePrice) * 100);
}

/* ============================================================
   API: 변형 가격 업데이트
   Medusa v2: POST /admin/products/:pid/variants/:vid
   prices 배열 전체 교체 + compare_at_price / cost_price 직접 필드 또는 metadata
   ============================================================ */
async function saveVariantPricing(
  productId: string,
  variantId: string,
  draft: {
    prices: VariantPrice[];
    // TODO(사장님결정): Medusa v2 직접 필드 vs metadata 중 하나로 확정.
    compare_at_price?: number | null;
    cost_price?: number | null;
  }
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: "POST",
    body: JSON.stringify({
      prices: draft.prices,
      /* Medusa v2 variant 직접 필드로 전달 (미지원 시 무시됨) */
      compare_at_price: draft.compare_at_price ?? null,
      cost_price: draft.cost_price ?? null,
    }),
  });
}

/* ============================================================
   컴포넌트
   ============================================================ */
interface Props {
  product: ProductDetail;
  onRefresh: () => Promise<void>;
}

export function PricePanel({ product, onRefresh }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const variants = (product.variants ?? []) as VariantWithPricing[];

  /* ── 드래프트 초기화 ── */
  function buildInitialDraft(v: VariantWithPricing): PriceDraft {
    const rep = representativePrice([v]);
    const salePrice = rep ? String(rep.amount) : "";

    /* 정상가: variant 직접 필드 → metadata fallback */
    const compareRaw =
      v.compare_at_price ??
      (v.metadata?.compare_at_price as number | undefined) ??
      null;
    /* 원가: variant 직접 필드 → metadata fallback */
    const costRaw =
      v.cost_price ??
      (v.metadata?.cost_price as number | undefined) ??
      null;

    return {
      salePrice,
      compareAtPrice: compareRaw != null ? String(compareRaw) : "",
      costPrice: costRaw != null ? String(costRaw) : "",
    };
  }

  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>(() => {
    const init: Record<string, PriceDraft> = {};
    for (const v of variants) init[v.id] = buildInitialDraft(v);
    return init;
  });

  function getDraft(v: VariantWithPricing): PriceDraft {
    return drafts[v.id] ?? buildInitialDraft(v);
  }

  function setDraft(variantId: string, patch: Partial<PriceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? {}), ...patch },
    }));
  }

  /* ── 저장 ── */
  const savePricing = useCallback(
    async (v: VariantWithPricing) => {
      const d = getDraft(v);
      const saleAmount = parseAmount(d.salePrice);
      if (saleAmount === null) {
        toast.show("판매가를 확인해 주세요.", "danger");
        return;
      }

      const compareAtAmount = parseAmount(d.compareAtPrice);
      const costAmount = parseAmount(d.costPrice);

      /* 유효성: 정상가 > 판매가 여야 할인가 의미 */
      if (compareAtAmount !== null && compareAtAmount > 0 && compareAtAmount < saleAmount) {
        toast.show("정상가는 판매가보다 크거나 같아야 합니다.", "danger");
        return;
      }
      /* 유효성: 원가 < 판매가 (마진 양수) — 경고는 toast info, 저장은 허용 */
      if (costAmount !== null && costAmount > saleAmount) {
        toast.show("원가가 판매가보다 높습니다 — 마진이 음수입니다.", "info");
      }

      /* 통화 유지 */
      const rep = representativePrice([v]);
      const currency = rep?.currency_code ?? "krw";

      setBusy(true);
      try {
        await saveVariantPricing(product.id, v.id, {
          prices: [{ amount: saleAmount, currency_code: currency }],
          compare_at_price: compareAtAmount,
          cost_price: costAmount,
        });
        await onRefresh();
        toast.show(`'${v.title ?? v.id}' 가격을 저장했습니다.`);
      } catch (e) {
        toast.show(`가격 저장 실패: ${(e as Error).message}`, "danger");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drafts, product.id, onRefresh, toast]
  );

  /* ============================================================
     렌더
     ============================================================ */
  if (variants.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "28px 16px",
          color: "var(--text-3)",
          fontSize: 13,
          border: "1px dashed var(--border)",
          borderRadius: 8,
        }}
      >
        등록된 변형이 없습니다. 옵션/변형 탭에서 먼저 변형을 추가해 주세요.
      </div>
    );
  }

  return (
    <div>
      {/* 안내 배너 */}
      <div
        className="notice"
        style={{ marginBottom: 20 }}
      >
        <span>
          판매가 = 실제 결제 금액. 정상가(비교가)가 있으면 할인율(%)을 자동 표시합니다.
          원가 입력 시 마진율을 계산합니다.
          {/* TODO(사장님결정): compare_at_price / cost_price 를 Medusa v2 직접 필드 vs metadata 중 어디에 저장할지 확정 필요. */}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {variants.map((v) => {
          const d = getDraft(v);
          const sale = parseAmount(d.salePrice);
          const compare = parseAmount(d.compareAtPrice);
          const cost = parseAmount(d.costPrice);

          const discountPct =
            sale !== null && compare !== null && compare > 0
              ? discountRate(sale, compare)
              : null;
          const marginPct =
            sale !== null && cost !== null && sale > 0
              ? marginRate(sale, cost)
              : null;

          return (
            <div
              key={v.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* 변형 헤더 */}
              <div
                style={{
                  padding: "10px 16px",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: 13 }}
                >
                  {v.title ?? "기본"}
                </span>
                {v.sku && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "var(--text-3)",
                      background: "var(--surface)",
                      padding: "1px 7px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {v.sku}
                  </span>
                )}
                {/* 할인율 배지 */}
                {discountPct !== null && discountPct > 0 && (
                  <span className="badge danger" style={{ marginLeft: "auto" }}>
                    <span className="bdot" />
                    {discountPct}% 할인
                  </span>
                )}
                {/* 마진율 배지 */}
                {marginPct !== null && (
                  <span
                    className={`badge ${marginPct >= 0 ? "success" : "danger"}`}
                    style={{ marginLeft: discountPct ? 0 : "auto" }}
                  >
                    <span className="bdot" />
                    마진 {marginPct}%
                  </span>
                )}
              </div>

              {/* 가격 3종 입력 */}
              <div
                style={{
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                }}
              >
                {/* 원가 */}
                <div>
                  <span className="field-l">
                    원가 (cost){" "}
                    <span
                      style={{ fontWeight: 400, color: "var(--text-3)" }}
                    >
                      — 마진 계산용
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="inp"
                    style={{ textAlign: "right" }}
                    placeholder="₩ 0"
                    value={d.costPrice}
                    onChange={(e) =>
                      setDraft(v.id, { costPrice: e.target.value })
                    }
                  />
                  {cost !== null && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        marginTop: 4,
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(cost)}
                    </div>
                  )}
                </div>

                {/* 정상가 */}
                <div>
                  <span className="field-l">
                    정상가 (compare_at){" "}
                    <span
                      style={{ fontWeight: 400, color: "var(--text-3)" }}
                    >
                      — 할인 전 표시가
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="inp"
                    style={{ textAlign: "right" }}
                    placeholder="₩ 0"
                    value={d.compareAtPrice}
                    onChange={(e) =>
                      setDraft(v.id, { compareAtPrice: e.target.value })
                    }
                  />
                  {compare !== null && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        marginTop: 4,
                        textAlign: "right",
                        textDecoration: "line-through",
                      }}
                    >
                      {formatCurrency(compare)}
                    </div>
                  )}
                </div>

                {/* 판매가 */}
                <div>
                  <span className="field-l">
                    판매가 <span className="req">*</span>{" "}
                    <span
                      style={{ fontWeight: 400, color: "var(--text-3)" }}
                    >
                      — 실제 결제 금액
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="inp"
                    style={{
                      textAlign: "right",
                      borderColor:
                        compare !== null &&
                        sale !== null &&
                        compare < sale
                          ? "var(--danger)"
                          : undefined,
                    }}
                    placeholder="₩ 0"
                    value={d.salePrice}
                    onChange={(e) =>
                      setDraft(v.id, { salePrice: e.target.value })
                    }
                  />
                  {sale !== null && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--primary)",
                        marginTop: 4,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(sale)}
                    </div>
                  )}
                </div>
              </div>

              {/* 저장 버튼 */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  background: "var(--surface-2)",
                }}
              >
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={busy}
                  onClick={() => savePricing(v)}
                >
                  {v.title ?? "기본"} 가격 저장
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

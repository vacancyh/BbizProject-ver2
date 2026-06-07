"use client";

/**
 * VariantMatrixPanel — 옵션×변형 매트릭스 편집 패널
 *
 * 역할:
 *  - 상품의 옵션(option: 색상·사이즈 등) 목록 표시/추가
 *  - 각 옵션 값(value) 관리
 *  - 옵션 조합별 변형(variant) 목록(SKU·판매가·재고) 표시 및 수정
 *  - 변형 추가 버튼 → 옵션 값 조합으로 자동 title 생성
 *
 * 데이터 연동: Medusa REST
 *  - GET  /admin/products/:id  → options, variants 포함
 *  - POST /admin/products/:id/options       — 옵션 추가
 *  - POST /admin/products/:id/options/:oid  — 옵션 수정
 *  - POST /admin/products/:id/variants      — 변형 추가
 *  - POST /admin/products/:id/variants/:vid — 변형 가격/SKU 수정
 *  - DELETE /admin/products/:id/variants/:vid — 변형 삭제
 *
 * 주의: 옵션 삭제 API 는 Medusa v2 에서 /admin/products/:id/options/:oid DELETE.
 *       사장님 결정 전까지 삭제는 비활성 처리(TODO).
 */

import { useCallback, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";
import {
  representativePrice,
  type ProductDetail,
  type ProductOption,
  type ProductVariant,
  type VariantPrice,
} from "@/lib/api/products";

/* ============================================================
   타입
   ============================================================ */
type VariantDraft = {
  /** 변형 ID (기존) or null (신규 미저장) */
  id: string | null;
  title: string;
  sku: string;
  /** 정상가 (원가 price set, KRW) */
  amount: string;
  prices?: VariantPrice[];
  /** 재고 수량 — Medusa inventory와 별개, variant 레벨 inventory_quantity 필드 */
  inventory_quantity: string;
};

type OptionDraft = {
  id: string | null;
  title: string;
  /** 옵션 값 목록 (쉼표 구분 편집용 문자열) */
  valuesRaw: string;
};

/* ============================================================
   헬퍼: Medusa /admin/products/:id/options 호출
   ============================================================ */
async function addProductOption(
  productId: string,
  title: string,
  values: string[]
): Promise<void> {
  // TODO(사장님결정): Medusa v2 옵션 값은 options.values 배열로 전달. API 버전별 차이 확인 필요.
  await apiFetch(`/admin/products/${productId}/options`, {
    method: "POST",
    body: JSON.stringify({ title, values }),
  });
}

async function addProductVariant(
  productId: string,
  payload: {
    title: string;
    sku?: string | null;
    prices: VariantPrice[];
    options: Record<string, string>;
    // TODO(사장님결정): inventory_quantity 지원 여부는 Medusa v2 설정에 따라 다름. 현재 필드 포함.
    inventory_quantity?: number;
  }
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateProductVariant(
  productId: string,
  variantId: string,
  patch: {
    sku?: string | null;
    prices?: VariantPrice[];
    // TODO(사장님결정): inventory_quantity 직접 수정 or Inventory 모듈 경유 결정 필요.
    inventory_quantity?: number;
  }
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

async function deleteProductVariant(
  productId: string,
  variantId: string
): Promise<void> {
  await apiFetch(`/admin/products/${productId}/variants/${variantId}`, {
    method: "DELETE",
  });
}

/* ============================================================
   컴포넌트
   ============================================================ */
interface Props {
  product: ProductDetail;
  /** 저장 후 상위에서 상세 새로고침 요청 */
  onRefresh: () => Promise<void>;
}

export function VariantMatrixPanel({ product, onRefresh }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  /* ── 옵션 추가 드래프트 ── */
  const [addingOption, setAddingOption] = useState(false);
  const [optionDraft, setOptionDraft] = useState<OptionDraft>({
    id: null,
    title: "",
    valuesRaw: "",
  });

  /* ── 변형 편집 드래프트 (variantId → 드래프트) ── */
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});

  /* ── 변형 추가 폼 ── */
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVariant, setNewVariant] = useState<Omit<VariantDraft, "id">>({
    title: "",
    sku: "",
    amount: "",
    inventory_quantity: "0",
  });

  /* ── 섹션 펼침 상태 ── */
  const [optionOpen, setOptionOpen] = useState(true);
  const [variantOpen, setVariantOpen] = useState(true);

  const options: ProductOption[] = product.options ?? [];
  const variants: ProductVariant[] = product.variants ?? [];

  /* ------------------------------------------------------------
     드래프트 초기화 헬퍼
     ------------------------------------------------------------ */
  function draftFor(v: ProductVariant): VariantDraft {
    if (variantDrafts[v.id]) return variantDrafts[v.id];
    const rep = representativePrice([v]);
    return {
      id: v.id,
      title: v.title ?? "",
      sku: v.sku ?? "",
      amount: rep ? String(rep.amount) : "",
      prices: v.prices,
      inventory_quantity: String(
        (v as unknown as { inventory_quantity?: number }).inventory_quantity ?? 0
      ),
    };
  }

  function setDraft(variantId: string, patch: Partial<VariantDraft>) {
    setVariantDrafts((prev) => ({
      ...prev,
      [variantId]: { ...draftFor({ id: variantId, title: null, sku: null, prices: [] }), ...patch },
    }));
  }

  /* ------------------------------------------------------------
     옵션 추가 저장
     ------------------------------------------------------------ */
  const saveOption = useCallback(async () => {
    const title = optionDraft.title.trim();
    const values = optionDraft.valuesRaw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!title) { toast.show("옵션 이름을 입력해 주세요.", "danger"); return; }
    if (values.length === 0) { toast.show("옵션 값을 최소 1개 입력해 주세요.", "danger"); return; }

    setBusy(true);
    try {
      await addProductOption(product.id, title, values);
      await onRefresh();
      setAddingOption(false);
      setOptionDraft({ id: null, title: "", valuesRaw: "" });
      toast.show(`옵션 '${title}'을(를) 추가했습니다.`);
    } catch (e) {
      toast.show(`옵션 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }, [optionDraft, product.id, onRefresh, toast]);

  /* ------------------------------------------------------------
     변형 추가 저장
     ------------------------------------------------------------ */
  const saveNewVariant = useCallback(async () => {
    const title = newVariant.title.trim();
    const amount = Number(newVariant.amount);

    if (!title) { toast.show("변형 이름(조합)을 입력해 주세요.", "danger"); return; }
    if (!Number.isFinite(amount) || amount < 0) { toast.show("가격을 확인해 주세요.", "danger"); return; }

    /* 첫 번째 옵션을 자동 매핑 — 옵션이 없을 경우 기본 옵션 사용 */
    // TODO(사장님결정): 다중 옵션 조합 매트릭스 생성 방식 확정 필요 (현재: 단순 단일 옵션 매핑)
    const optionsMap: Record<string, string> = {};
    if (options.length > 0) {
      optionsMap[options[0].title] = title;
    } else {
      optionsMap["기본"] = title;
    }

    setBusy(true);
    try {
      await addProductVariant(product.id, {
        title,
        sku: newVariant.sku.trim() || null,
        prices: [{ amount, currency_code: "krw" }],
        options: optionsMap,
        inventory_quantity: Number(newVariant.inventory_quantity) || 0,
      });
      await onRefresh();
      setAddingVariant(false);
      setNewVariant({ title: "", sku: "", amount: "", inventory_quantity: "0" });
      toast.show(`변형 '${title}'을(를) 추가했습니다.`);
    } catch (e) {
      toast.show(`변형 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setBusy(false);
    }
  }, [newVariant, options, product.id, onRefresh, toast]);

  /* ------------------------------------------------------------
     변형 저장 (SKU + 가격 + 재고)
     ------------------------------------------------------------ */
  const saveVariant = useCallback(
    async (variantId: string) => {
      const d = variantDrafts[variantId];
      if (!d) return;

      const amount = Number(d.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.show("가격을 확인해 주세요.", "danger");
        return;
      }

      /* 기존 통화 유지, 없으면 krw */
      const currency =
        d.prices?.find((p) => p.currency_code === "krw")?.currency_code ??
        d.prices?.[0]?.currency_code ??
        "krw";

      setBusy(true);
      try {
        await updateProductVariant(product.id, variantId, {
          sku: d.sku.trim() || null,
          prices: [{ amount, currency_code: currency }],
          inventory_quantity: Number(d.inventory_quantity) || 0,
        });
        await onRefresh();
        /* 저장 완료 후 드래프트 제거 */
        setVariantDrafts((prev) => {
          const next = { ...prev };
          delete next[variantId];
          return next;
        });
        toast.show(`변형을 저장했습니다. (${formatCurrency(amount, currency)})`);
      } catch (e) {
        toast.show(`변형 저장 실패: ${(e as Error).message}`, "danger");
      } finally {
        setBusy(false);
      }
    },
    [variantDrafts, product.id, onRefresh, toast]
  );

  /* ------------------------------------------------------------
     변형 삭제
     ------------------------------------------------------------ */
  const removeVariant = useCallback(
    async (variantId: string, variantTitle: string | null) => {
      if (!confirm(`'${variantTitle ?? variantId}' 변형을 삭제하시겠습니까?`)) return;
      setBusy(true);
      try {
        await deleteProductVariant(product.id, variantId);
        await onRefresh();
        toast.show("변형을 삭제했습니다.");
      } catch (e) {
        toast.show(`변형 삭제 실패: ${(e as Error).message}`, "danger");
      } finally {
        setBusy(false);
      }
    },
    [product.id, onRefresh, toast]
  );

  /* ============================================================
     렌더
     ============================================================ */
  return (
    <div>
      {/* ── 옵션 섹션 ── */}
      <div className="dsec">
        <div
          className="dsec-t"
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => setOptionOpen((v) => !v)}
        >
          옵션 정의
          <span style={{ marginLeft: "auto", color: "var(--text-3)" }}>
            {optionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>

        {optionOpen && (
          <>
            {options.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>
                등록된 옵션이 없습니다. 아래에서 옵션을 추가해 주세요.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      {opt.title}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(opt.values ?? []).map((v) => (
                        <span
                          key={v.value}
                          style={{
                            padding: "2px 10px",
                            borderRadius: 20,
                            background: "var(--primary-weak)",
                            color: "var(--primary)",
                            fontSize: 12,
                            fontWeight: 600,
                            border: "1px solid #C7D7FE",
                          }}
                        >
                          {v.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 옵션 추가 폼 */}
            {addingOption ? (
              <div
                style={{
                  padding: "14px",
                  border: "1px solid var(--primary)",
                  borderRadius: 8,
                  background: "var(--primary-weak)",
                  marginBottom: 12,
                }}
              >
                <div className="frow">
                  <span className="field-l">
                    옵션 이름 <span className="req">*</span>
                  </span>
                  <input
                    className="inp"
                    placeholder="예) 색상, 사이즈"
                    value={optionDraft.title}
                    onChange={(e) =>
                      setOptionDraft((d) => ({ ...d, title: e.target.value }))
                    }
                  />
                </div>
                <div className="frow">
                  <span className="field-l">
                    옵션 값 <span className="req">*</span>{" "}
                    <span
                      style={{ fontWeight: 400, color: "var(--text-3)" }}
                    >
                      (쉼표로 구분)
                    </span>
                  </span>
                  <input
                    className="inp"
                    placeholder="예) 빨강, 파랑, 초록"
                    value={optionDraft.valuesRaw}
                    onChange={(e) =>
                      setOptionDraft((d) => ({ ...d, valuesRaw: e.target.value }))
                    }
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAddingOption(false);
                      setOptionDraft({ id: null, title: "", valuesRaw: "" });
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={saveOption}
                  >
                    옵션 저장
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setAddingOption(true)}
              >
                <Plus size={15} /> 옵션 추가
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 변형(SKU) 매트릭스 섹션 ── */}
      <div className="dsec">
        <div
          className="dsec-t"
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          onClick={() => setVariantOpen((v) => !v)}
        >
          변형 매트릭스 (SKU·가격·재고)
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>
            {variants.length}개
          </span>
          <span style={{ marginLeft: "auto", color: "var(--text-3)" }}>
            {variantOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>

        {variantOpen && (
          <>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              {variants.length === 0 ? (
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
                  등록된 변형이 없습니다. 아래에서 변형을 추가해 주세요.
                </div>
              ) : (
                <table className="dt">
                  <thead>
                    <tr>
                      <th>변형 이름</th>
                      <th>SKU</th>
                      <th className="num">판매가 (KRW)</th>
                      <th className="num">재고 수량</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => {
                      const d = draftFor(v);
                      const isDirty = !!variantDrafts[v.id];
                      return (
                        <tr key={v.id} style={{ cursor: "default" }}>
                          {/* 변형 이름 */}
                          <td style={{ fontWeight: 600 }}>{v.title ?? "—"}</td>
                          {/* SKU */}
                          <td>
                            <input
                              className="inp"
                              style={{ height: 30, fontSize: 12, fontFamily: "monospace" }}
                              value={d.sku}
                              placeholder="SKU 입력"
                              onChange={(e) =>
                                setDraft(v.id, { ...d, sku: e.target.value })
                              }
                            />
                          </td>
                          {/* 판매가 */}
                          <td className="num">
                            <input
                              type="number"
                              className="inp"
                              style={{ height: 30, textAlign: "right", fontSize: 12, width: 120 }}
                              value={d.amount}
                              placeholder="0"
                              onChange={(e) =>
                                setDraft(v.id, { ...d, amount: e.target.value })
                              }
                            />
                          </td>
                          {/* 재고 */}
                          <td className="num">
                            <input
                              type="number"
                              min={0}
                              className="inp"
                              style={{ height: 30, textAlign: "right", fontSize: 12, width: 90 }}
                              value={d.inventory_quantity}
                              placeholder="0"
                              onChange={(e) =>
                                setDraft(v.id, {
                                  ...d,
                                  inventory_quantity: e.target.value,
                                })
                              }
                            />
                          </td>
                          {/* 액션 */}
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                justifyContent: "flex-end",
                              }}
                            >
                              {isDirty && (
                                <button
                                  type="button"
                                  className="btn sm primary"
                                  disabled={busy}
                                  onClick={() => saveVariant(v.id)}
                                >
                                  저장
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn sm"
                                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                                disabled={busy}
                                onClick={() => removeVariant(v.id, v.title)}
                                title="변형 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 변형 추가 폼 */}
            {addingVariant ? (
              <div
                style={{
                  padding: "14px",
                  border: "1px solid var(--primary)",
                  borderRadius: 8,
                  background: "var(--primary-weak)",
                }}
              >
                <div className="fgrid2" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="field-l">
                      변형 이름 <span className="req">*</span>
                    </span>
                    <input
                      className="inp"
                      placeholder="예) 빨강 / S"
                      value={newVariant.title}
                      onChange={(e) =>
                        setNewVariant((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <span className="field-l">SKU</span>
                    <input
                      className="inp"
                      placeholder="예) PROD-RED-S"
                      value={newVariant.sku}
                      onChange={(e) =>
                        setNewVariant((d) => ({ ...d, sku: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="fgrid2" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="field-l">
                      판매가 (KRW) <span className="req">*</span>
                    </span>
                    <input
                      type="number"
                      className="inp"
                      style={{ textAlign: "right" }}
                      placeholder="₩ 0"
                      value={newVariant.amount}
                      onChange={(e) =>
                        setNewVariant((d) => ({ ...d, amount: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <span className="field-l">
                      초기 재고 수량{" "}
                      {/* TODO(사장님결정): 재고는 Inventory 모듈 경유가 권장. 여기선 variant 레벨 직접 입력. */}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="inp"
                      style={{ textAlign: "right" }}
                      placeholder="0"
                      value={newVariant.inventory_quantity}
                      onChange={(e) =>
                        setNewVariant((d) => ({
                          ...d,
                          inventory_quantity: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAddingVariant(false);
                      setNewVariant({
                        title: "",
                        sku: "",
                        amount: "",
                        inventory_quantity: "0",
                      });
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={saveNewVariant}
                  >
                    변형 추가
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setAddingVariant(true)}
              >
                <Plus size={15} /> 변형 추가
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

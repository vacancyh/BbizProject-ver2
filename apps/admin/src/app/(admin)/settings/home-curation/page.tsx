"use client";

/**
 * 홈 큐레이션(MD 추천) 관리 — 메인에 노출할 추천 상품을 지정/저장.
 * 기존 product-curation 어드민이 read-only 미리보기였던 갭을 보완(저장 가능).
 * 백엔드 cms 모듈(/admin/home-curations) 래핑.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  listHomeCurations,
  addHomeCuration,
  deleteHomeCuration,
  type HomeCuration,
} from "@/lib/api/cms";
import { listProducts, type ProductListItem } from "@/lib/api/products";

export default function HomeCurationPage() {
  const toast = useToast();
  const [curations, setCurations] = useState<HomeCuration[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => m.set(p.id, p.title));
    return m;
  }, [products]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        listHomeCurations(),
        listProducts({ limit: 100, status: "published" }),
      ]);
      setCurations(c);
      setProducts(p.products);
    } catch (e) {
      toast.show((e as Error)?.message ?? "불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!selected) {
      toast.show("추가할 상품을 선택해 주세요.", "danger");
      return;
    }
    try {
      await addHomeCuration({ product_id: selected, sort_order: curations.length + 1 });
      toast.show("추천 상품을 추가했습니다.", "success");
      setSelected("");
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "추가 실패", "danger");
    }
  }

  async function confirmDelete() {
    if (!delId) return;
    try {
      await deleteHomeCuration(delId);
      toast.show("삭제했습니다.", "success");
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    } finally {
      setDelId(null);
    }
  }

  const available = products.filter(
    (p) => !curations.some((c) => c.product_id === p.id)
  );

  return (
    <div className="scr">
      <div className="wrap c-form">
        <div className="page-header">
          <div className="ph-l">
            <h1>홈 큐레이션 (MD 추천)</h1>
            <div className="ph-sub">
              메인에 노출할 추천 상품을 지정합니다 · 스토어프론트 홈 “MD 추천” 섹션
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-pad">
            <div className="dsec-t">추천 상품 추가</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="inp"
                style={{ flex: 1 }}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                data-testid="curation-select"
              >
                <option value="">상품 선택…</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn primary"
                onClick={add}
                data-testid="curation-add"
              >
                <Plus size={15} />
                추가
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-pad">
            <div className="dsec-t">현재 노출 순서</div>
            {loading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                불러오는 중…
              </div>
            ) : curations.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                지정된 추천 상품이 없습니다. 위에서 추가해 주세요.
              </div>
            ) : (
              curations.map((c, i) => (
                <div className="dline" key={c.id} data-testid="curation-row">
                  <span style={{ color: "var(--text-3)", width: 28 }}>{i + 1}</span>
                  <span className="dl-t" style={{ flex: 1 }}>
                    <b>{titleById.get(c.product_id) ?? c.product_id}</b>
                  </span>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setDelId(c.id)}
                    data-testid="curation-delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!delId}
        title="추천에서 제외하시겠습니까?"
        message="홈 MD 추천 섹션에서 제외됩니다."
        confirmText="제외"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}

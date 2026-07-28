"use client";

/**
 * 마케팅 — Medusa 캠페인 호출/래핑(로직 복사 X).
 *  - 캠페인 목록 + 생성(예산 usage/spend, 기간) + 삭제.
 *  - 알림톡·SMS·푸시 등 한국형 마케팅 채널은 커스텀 모듈(후속, GAP_B 배지 유지).
 */
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  PageHeader,
  DataTable,
  DetailDrawer,
  ConfirmModal,
  useToast,
  type Column,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { listCampaigns, createCampaign, deleteCampaign, type Campaign } from "@/lib/api/marketing";

function budgetText(c: Campaign): string {
  const b = c.budget;
  if (!b || b.limit == null) return "—";
  if (b.type === "spend") {
    const cur = b.currency_code ?? "krw";
    return `${formatCurrency(b.used ?? 0, cur)} / ${formatCurrency(b.limit, cur)}`;
  }
  return `${(b.used ?? 0).toLocaleString("ko-KR")} / ${b.limit.toLocaleString("ko-KR")}회`;
}
function dateText(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("ko-KR");
  } catch {
    return s;
  }
}

function LabeledInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-text-2">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary" />
    </label>
  );
}

const EMPTY = {
  name: "",
  campaign_identifier: "",
  description: "",
  budgetType: "usage" as "usage" | "spend",
  limit: "",
  currency_code: "krw",
  starts_at: "",
  ends_at: "",
};

export default function Page() {
  const toast = useToast();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { campaigns } = await listCampaigns();
      setRows(campaigns);
    } catch (e) {
      toast.show((e as Error)?.message ?? "불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!form.name.trim() || !form.campaign_identifier.trim() || !form.limit) {
      toast.show("이름·식별자·예산 한도는 필수입니다.", "danger");
      return;
    }
    setSaving(true);
    try {
      await createCampaign({
        name: form.name.trim(),
        campaign_identifier: form.campaign_identifier.trim(),
        description: form.description.trim() || undefined,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : undefined,
        budget: {
          type: form.budgetType,
          limit: Number(form.limit),
          currency_code: form.budgetType === "spend" ? form.currency_code : undefined,
        },
      });
      toast.show("캠페인을 생성했습니다.");
      setCreating(false);
      setForm({ ...EMPTY });
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "생성 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!delTarget) return;
    try {
      await deleteCampaign(delTarget.id);
      toast.show("캠페인을 삭제했습니다.");
      setDelTarget(null);
      await load();
    } catch (e) {
      toast.show((e as Error)?.message ?? "삭제 실패", "danger");
    }
  }

  const columns: Column<Campaign>[] = [
    { header: "캠페인", cell: (c) => <span className="font-bold text-text">{c.name}</span> },
    { header: "식별자", cell: (c) => <span className="text-text-2">{c.campaign_identifier}</span> },
    { header: "예산", cell: (c) => <span className="tabular-nums text-text-2">{budgetText(c)}</span> },
    { header: "기간", cell: (c) => <span className="text-text-3">{dateText(c.starts_at)} ~ {dateText(c.ends_at)}</span> },
    { header: "연결 프로모션", numeric: true, cell: (c) => <span className="tabular-nums">{c.promotions?.length ?? 0}</span> },
    {
      header: "",
      cell: (c) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); setDelTarget(c); }} className="text-text-3 hover:text-danger" title="삭제">
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="마케팅"
        sub="프로모션 캠페인 (예산·기간) · 알림톡/SMS 채널은 후속"
        gap="B"
        actions={
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press">
            <Plus size={15} /> 캠페인 생성
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        loading={loading}
        emptyTitle="캠페인이 없습니다. 새 캠페인을 생성하세요."
      />

      <DetailDrawer open={creating} title="캠페인 생성" sub="프로모션을 묶는 예산·기간 단위" onClose={() => setCreating(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-sm border border-border px-3 py-2 text-sm font-bold text-text hover:bg-surface-2">취소</button>
            <button type="button" onClick={submit} disabled={saving} className="rounded-sm bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-press disabled:opacity-40">생성</button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <LabeledInput label="캠페인명 *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="여름 세일" />
          <LabeledInput label="식별자 *" value={form.campaign_identifier} onChange={(v) => setForm((f) => ({ ...f, campaign_identifier: v }))} placeholder="SUMMER-2026" />
          <LabeledInput label="설명" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div>
            <span className="mb-1 block text-xs font-medium text-text-2">예산 유형</span>
            <div className="flex gap-2">
              {(["usage", "spend"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, budgetType: t }))}
                  className={`flex-1 rounded-sm border px-3 py-2 text-sm font-bold ${form.budgetType === t ? "border-primary bg-primary-weak text-primary" : "border-border text-text-2"}`}>
                  {t === "usage" ? "사용 횟수" : "금액"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <LabeledInput label={form.budgetType === "spend" ? "예산 한도(금액) *" : "예산 한도(횟수) *"} type="number" value={form.limit} onChange={(v) => setForm((f) => ({ ...f, limit: v }))} placeholder="1000" />
            </div>
            {form.budgetType === "spend" ? (
              <div className="w-28">
                <span className="mb-1 block text-xs font-medium text-text-2">통화</span>
                <div className="rounded-sm border border-border bg-surface px-2 py-2 text-sm text-text">원(KRW)</div>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <div className="flex-1"><LabeledInput label="시작일" type="date" value={form.starts_at} onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))} /></div>
            <div className="flex-1"><LabeledInput label="종료일" type="date" value={form.ends_at} onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))} /></div>
          </div>
        </div>
      </DetailDrawer>

      <ConfirmModal
        open={!!delTarget}
        title="캠페인 삭제"
        message={`'${delTarget?.name}' 캠페인을 삭제하시겠습니까?`}
        confirmText="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}

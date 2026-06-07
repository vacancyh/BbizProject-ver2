"use client";

/**
 * 배송정책 관리 — Medusa /admin/shipping-options · /admin/shipping-profiles 호출/래핑.
 *
 * 화면 구성:
 *  ① 페이지 헤더 + 신규 배송 옵션 추가 버튼
 *  ② 배송 프로파일 섹션 (목록·생성)
 *  ③ 배송 옵션 섹션 (배송비·지역·도서산간 추가배송비 등)
 *  ④ 배송 옵션 생성/삭제 모달 + ConfirmModal
 *
 * 기존 shipping.ts API(listShippingOptions, createShippingOption 등) 재사용.
 * shipping/page.tsx 의 UI 패턴(card, dt, 토스트, PageHeader) 정합.
 *
 * 미확정 기본값:
 *  - 기본 배송비: 3000원 (KRW)  // TODO(사장님결정): 실제 기본 배송비 확정 필요
 *  - 도서산간 추가배송비: 5000원  // TODO(사장님결정): 도서산간/제주 추가배송비 확정 필요
 *  - 무료배송 기준 금액: 50000원  // TODO(사장님결정): 무료배송 기준금액 확정 필요
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Package, Truck, RefreshCw } from "lucide-react";
import {
  PageHeader,
  ConfirmModal,
  EmptyState,
  LoadingSkeleton,
  useToast,
} from "@/components/ui";
import {
  listShippingOptions,
  listShippingProfiles,
  createShippingOption,
  deleteShippingOption,
  createShippingProfile,
  listStockLocations,
  type ShippingOption,
  type ShippingProfile,
  type StockLocation,
} from "@/lib/api/shipping";

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** 기본 통화 코드 — TODO(사장님결정): 다중 통화 지원 시 store supported_currencies 연동 */
const DEFAULT_CURRENCY = "krw";

/** 기본 배송비 (원 단위) — TODO(사장님결정): 실제 기본 배송비 확정 필요 */
const DEFAULT_SHIPPING_AMOUNT = 3000;

/** 도서산간 추가배송비 (원 단위) — TODO(사장님결정): 도서산간/제주 추가배송비 확정 필요 */
const REMOTE_AREA_EXTRA_AMOUNT = 5000;

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function formatKrw(amount: number): string {
  return amount.toLocaleString("ko-KR") + "원";
}

function formatKst(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return iso;
  }
}

function priceLabel(opt: ShippingOption): string {
  const krw = opt.prices?.find((p) => p.currency_code === DEFAULT_CURRENCY);
  if (!krw) return "—";
  return krw.amount === 0 ? "무료" : formatKrw(krw.amount);
}

// ─── 배송 옵션 생성 폼 ────────────────────────────────────────────────────────

type OptionFormData = {
  name: string;
  profileId: string;
  serviceZoneId: string;
  amount: number | "";
  isFree: boolean;
};

const EMPTY_FORM: OptionFormData = {
  name: "",
  profileId: "",
  serviceZoneId: "",
  // TODO(사장님결정): 기본 배송비 DEFAULT_SHIPPING_AMOUNT 사용. 확정 후 수정.
  amount: DEFAULT_SHIPPING_AMOUNT,
  isFree: false,
};

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default function ShippingPolicyPage() {
  const toast = useToast();

  // 배송 옵션 목록
  const [options, setOptions] = useState<ShippingOption[]>([]);
  // 배송 프로파일 목록
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  // 창고 + 서비스 구역 목록
  const [locations, setLocations] = useState<StockLocation[]>([]);

  const [loading, setLoading] = useState(true);

  // 배송 옵션 생성 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<OptionFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 프로파일 생성 인라인
  const [newProfileName, setNewProfileName] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);

  // 삭제 confirm
  const [deleteTarget, setDeleteTarget] = useState<ShippingOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── 데이터 로드 ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [optRes, profRes, locRes] = await Promise.all([
        listShippingOptions(),
        listShippingProfiles(),
        listStockLocations(),
      ]);
      setOptions(optRes.shipping_options);
      setProfiles(profRes.shipping_profiles);
      setLocations(locRes.stock_locations);
    } catch (e) {
      toast.show(`데이터 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── 서비스 구역 목록(창고에서 추출) ─────────────────────────────────────────
  const serviceZones = locations.flatMap((loc) =>
    (loc.fulfillment_sets ?? []).flatMap((fs) =>
      (fs.service_zones ?? []).map((sz) => ({
        id: sz.id,
        label: `${loc.name} / ${sz.name}`,
        locationName: loc.name,
        zoneName: sz.name,
      }))
    )
  );

  // ── 배송 옵션 생성 ──────────────────────────────────────────────────────────
  async function submitOption() {
    const name = form.name.trim();
    if (!name) {
      toast.show("배송 옵션명을 입력해 주세요.", "danger");
      return;
    }
    if (!form.profileId) {
      toast.show("배송 프로파일을 선택해 주세요.", "danger");
      return;
    }
    if (!form.serviceZoneId) {
      toast.show("서비스 구역(창고)을 선택해 주세요.", "danger");
      return;
    }
    const amount = form.isFree ? 0 : Number(form.amount);
    if (!form.isFree && (!Number.isFinite(amount) || amount < 0)) {
      toast.show("배송비를 올바르게 입력해 주세요.", "danger");
      return;
    }

    setSubmitting(true);
    try {
      // Medusa 기본 배송 공급자 ID — manual_manual (Medusa v2 기본값)
      const providerId = "manual_manual";
      await createShippingOption({
        name,
        serviceZoneId: form.serviceZoneId,
        shippingProfileId: form.profileId,
        providerId,
        prices: [{ currency_code: DEFAULT_CURRENCY, amount }],
      });
      toast.show(`배송 옵션 '${name}'을 추가했습니다.`);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      toast.show(`배송 옵션 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setSubmitting(false);
    }
  }

  // ── 배송 옵션 삭제 ──────────────────────────────────────────────────────────
  async function handleDeleteOption(opt: ShippingOption) {
    setDeleting(true);
    try {
      await deleteShippingOption(opt.id);
      toast.show(`배송 옵션 '${opt.name}'을 삭제했습니다.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.show(`삭제 실패: ${(e as Error).message}`, "danger");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── 배송 프로파일 생성 ──────────────────────────────────────────────────────
  async function submitProfile() {
    const name = newProfileName.trim();
    if (!name) {
      toast.show("프로파일 명을 입력해 주세요.", "danger");
      return;
    }
    setAddingProfile(true);
    try {
      await createShippingProfile({ name, type: "default" });
      toast.show(`배송 프로파일 '${name}'을 추가했습니다.`);
      setNewProfileName("");
      await load();
    } catch (e) {
      toast.show(`프로파일 추가 실패: ${(e as Error).message}`, "danger");
    } finally {
      setAddingProfile(false);
    }
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ① 페이지 헤더 */}
      <PageHeader
        title="배송정책 관리"
        sub="배송비·지역·서비스 구역·배송 프로파일 등 정책 관리"
        actions={
          <>
            <button
              className="btn ghost"
              type="button"
              onClick={() => void load()}
              aria-label="새로고침"
            >
              <RefreshCw size={15} />
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setModalOpen(true);
              }}
            >
              <Plus size={16} />
              배송 옵션 추가
            </button>
          </>
        }
      />

      {/* 안내 배너 — 기본값 미확정 항목 */}
      <div
        className="mb-5 rounded border border-border bg-surface-2 px-4 py-3 text-sm text-text-2"
        role="note"
      >
        <strong className="text-text">📋 미확정 기본값 안내:</strong>{" "}
        기본 배송비 <strong>{formatKrw(DEFAULT_SHIPPING_AMOUNT)}</strong>·도서산간 추가 <strong>{formatKrw(REMOTE_AREA_EXTRA_AMOUNT)}</strong>·무료배송 기준{" "}
        <strong>50,000원</strong>은 임시값입니다. 사장님 결정 후 코드 <code className="text-[11px]">TODO(사장님결정)</code> 주석을 수정해 주세요.
      </div>

      {loading ? (
        <div className="rounded bg-surface p-4 shadow-xs">
          <LoadingSkeleton rows={6} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ② 배송 프로파일 섹션 */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
              <Package size={16} />
              배송 프로파일
            </h2>
            <div className="overflow-hidden rounded bg-surface shadow-xs">
              {profiles.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold text-text-2">
                      <th className="px-4 py-3">프로파일명</th>
                      <th className="px-4 py-3">유형</th>
                      <th className="px-4 py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-text">{p.name}</td>
                        <td className="px-4 py-3 text-text-2">{p.type}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-text-3">{p.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6">
                  <EmptyState
                    icon={<Package size={24} />}
                    title="배송 프로파일이 없습니다"
                    description="배송 옵션 생성 전에 프로파일을 먼저 추가해 주세요."
                  />
                </div>
              )}

              {/* 프로파일 인라인 추가 폼 */}
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="h-9 flex-1 rounded border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
                    placeholder="새 프로파일 명 (예: 일반배송, 냉장배송)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submitProfile()}
                    disabled={addingProfile}
                  />
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => void submitProfile()}
                    disabled={addingProfile || !newProfileName.trim()}
                  >
                    {addingProfile ? "추가 중…" : "추가"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ③ 배송 옵션 섹션 */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
              <Truck size={16} />
              배송 옵션 · 배송비 정책
            </h2>
            <div className="overflow-hidden rounded bg-surface shadow-xs">
              {options.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold text-text-2">
                      <th className="px-4 py-3">옵션명</th>
                      <th className="px-4 py-3">배송비 (KRW)</th>
                      <th className="px-4 py-3">프로파일</th>
                      <th className="px-4 py-3">서비스 구역 ID</th>
                      <th className="px-4 py-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((opt) => {
                      const profileName =
                        profiles.find((p) => p.id === opt.shipping_profile_id)?.name ?? "—";
                      return (
                        <tr key={opt.id} className="border-b border-border last:border-0 align-top">
                          <td className="px-4 py-3 font-medium text-text">{opt.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                priceLabel(opt) === "무료"
                                  ? "font-bold text-primary"
                                  : "text-text-2"
                              }
                            >
                              {priceLabel(opt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-2">{profileName}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-text-3">
                            {opt.service_zone_id}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="btn sm icon danger"
                              aria-label="삭제"
                              onClick={() => setDeleteTarget(opt)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6">
                  <EmptyState
                    icon={<Truck size={24} />}
                    title="등록된 배송 옵션이 없습니다"
                    description="배송비·지역·도서산간 추가배송비 등 정책을 등록해 주세요."
                    action={
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => {
                          setForm(EMPTY_FORM);
                          setModalOpen(true);
                        }}
                      >
                        <Plus size={16} />
                        배송 옵션 추가
                      </button>
                    }
                  />
                </div>
              )}
            </div>
          </section>

          {/* ④ 도서산간 안내 카드 */}
          <section>
            <div className="rounded border border-border bg-surface px-5 py-4 text-sm shadow-xs">
              <div className="mb-2 font-bold text-text">도서산간 · 제주 추가배송비 정책</div>
              <p className="text-text-2">
                도서산간/제주 지역 추가배송비는 별도 서비스 구역(geo_zone)을 생성하고,
                해당 구역에 추가 배송 옵션을 등록하는 방식으로 적용합니다.
              </p>
              <ul className="mt-3 space-y-1 text-text-3">
                {/* TODO(사장님결정): 도서산간 추가배송비 REMOTE_AREA_EXTRA_AMOUNT 적용 여부 확인 후 실제 구역 생성 필요 */}
                <li>• 현재 기본값: 추가 {formatKrw(REMOTE_AREA_EXTRA_AMOUNT)} (임시, 미확정)</li>
                <li>• 적용 방법: 창고 관리 → 서비스 구역(제주/도서산간) 생성 → 본 화면에서 옵션 추가</li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* ── 배송 옵션 생성 모달 ── */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded bg-surface p-5 shadow-lg"
          >
            <h3 className="text-base font-bold text-text">배송 옵션 추가</h3>
            <p className="mt-1.5 text-sm text-text-2">
              배송비 정책(정액 flat)을 등록합니다. 무료배송 옵션은 금액을 0으로 설정하세요.
            </p>

            <div className="mt-4 space-y-3">
              {/* 옵션명 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="opt-name">
                  옵션명 <span style={{ color: "var(--danger, #e11d48)" }}>*</span>
                </label>
                <input
                  id="opt-name"
                  type="text"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="예: 기본 배송, 무료배송, 제주 추가배송"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* 배송 프로파일 선택 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="opt-profile">
                  배송 프로파일 <span style={{ color: "var(--danger, #e11d48)" }}>*</span>
                </label>
                <select
                  id="opt-profile"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  value={form.profileId}
                  onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                >
                  <option value="">프로파일 선택…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
                {profiles.length === 0 ? (
                  <p className="mt-1 text-[11px] text-danger">
                    먼저 배송 프로파일을 추가해 주세요.
                  </p>
                ) : null}
              </div>

              {/* 서비스 구역 선택 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="opt-zone">
                  서비스 구역 (창고) <span style={{ color: "var(--danger, #e11d48)" }}>*</span>
                </label>
                <select
                  id="opt-zone"
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
                  value={form.serviceZoneId}
                  onChange={(e) => setForm((f) => ({ ...f, serviceZoneId: e.target.value }))}
                >
                  <option value="">서비스 구역 선택…</option>
                  {serviceZones.map((sz) => (
                    <option key={sz.id} value={sz.id}>
                      {sz.label}
                    </option>
                  ))}
                </select>
                {serviceZones.length === 0 ? (
                  <p className="mt-1 text-[11px] text-text-3">
                    창고 관리에서 창고 및 서비스 구역을 먼저 생성해 주세요.
                  </p>
                ) : null}
              </div>

              {/* 배송비 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-3" htmlFor="opt-amount">
                  배송비 (KRW)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-text-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={form.isFree}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isFree: e.target.checked, amount: e.target.checked ? 0 : DEFAULT_SHIPPING_AMOUNT }))
                      }
                    />
                    무료배송
                  </label>
                  {!form.isFree ? (
                    <input
                      id="opt-amount"
                      type="number"
                      min={0}
                      step={500}
                      className="h-9 w-32 rounded border border-border bg-surface px-3 text-sm"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, amount: e.target.value === "" ? "" : Number(e.target.value) }))
                      }
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">0원 (무료)</span>
                  )}
                </div>
                {/* TODO(사장님결정): 기본 배송비 DEFAULT_SHIPPING_AMOUNT(현재 3,000원) 확정 필요 */}
                <p className="mt-1 text-[11px] text-text-3">
                  기본값 {formatKrw(DEFAULT_SHIPPING_AMOUNT)} — 사장님 결정 후 수정 필요(TODO 주석 참조)
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => void submitOption()}
                disabled={submitting}
              >
                {submitting ? "추가 중…" : "추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 삭제 Confirm ── */}
      <ConfirmModal
        open={!!deleteTarget}
        danger
        title="배송 옵션을 삭제하시겠습니까?"
        message="삭제 후 해당 배송 옵션을 사용하는 주문에 영향을 줄 수 있습니다."
        confirmText={deleting ? "삭제 중…" : "삭제"}
        meta={{
          target: deleteTarget?.name,
          effect: "배송 옵션 영구 삭제",
          reversible: false,
        }}
        onConfirm={() => {
          if (deleteTarget) void handleDeleteOption(deleteTarget);
        }}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

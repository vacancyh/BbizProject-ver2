"use client";

/**
 * 쇼핑몰 설정 — 프로토타입 admin-screen-misc.js SC.settings 1:1 이식.
 * 5 tabs: 기본 정보 / 다국어·통화 / 배송·결제 / 운영자 권한 / 알림
 * 데이터: 실 Medusa (settings.ts / rbac.ts). 통화 = KRW 고정 (선택 UI 없음).
 */
import { useCallback, useEffect, useState } from "react";
import { Check, Upload, Info, Globe } from "lucide-react";
import { ConfirmModal, useToast } from "@/components/ui";
import {
  getStoreSettings,
  updateStore,
  listRegions,
  updateRegion,
  type StoreSettings,
  type StoreMetadata,
  type RegionInfo,
} from "@/lib/api/settings";
import {
  listTaxRegions,
  updateTaxRate,
  type TaxRegion,
} from "@/lib/api/admin-config";
import {
  validateTaxRateInput,
  validateRegionNameInput,
  KOREA_VAT_RATE,
} from "@/lib/settings/region-tax-logic";
import { validateStoreInput } from "@/lib/settings/store-logic";
import {
  getUsers,
  assignRole,
  type AdminUserRow,
  type RoleKey,
} from "@/lib/api/rbac";

// ─── 탭 정의 ───────────────────────────────────────────────────────────────

type TabId = "basic" | "lang" | "region-tax" | "shipping" | "roles" | "notify";
const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "기본 정보" },
  { id: "lang", label: "다국어·통화" },
  { id: "region-tax", label: "지역·세금" },
  { id: "shipping", label: "배송·결제" },
  { id: "roles", label: "운영자 권한" },
  { id: "notify", label: "알림" },
];

// ─── 언어 정의 (KR/EN/JP는 기본 활성, CN은 비활성) ────────────────────────

type LangEntry = { code: string; name: string; on: boolean };

const DEFAULT_LANGS: LangEntry[] = [
  { code: "KR", name: "한국어 (기본)", on: true },
  { code: "EN", name: "English", on: true },
  { code: "JP", name: "日本語", on: true },
  { code: "CN", name: "简体中文", on: false },
];

// ─── RBAC role 레이블 매핑 ────────────────────────────────────────────────

const ROLE_LABELS: Record<RoleKey, string> = {
  super: "최고관리자",
  operation: "주문·CS",
  cs: "상품·프로모션",
  marketer: "읽기전용",
};

const ROLE_OPTIONS: { key: RoleKey; label: string }[] = [
  { key: "operation", label: "주문·CS" },
  { key: "cs", label: "상품·프로모션" },
  { key: "marketer", label: "읽기전용" },
];

// ─── 결과 모달 (prototype ADMIN.result 이식) ──────────────────────────────

function ResultModal({
  open,
  status,
  title,
  msg,
  onClose,
}: {
  open: boolean;
  status: "success" | "fail";
  title: string;
  msg: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="result-modal scr" style={{ textAlign: "center", background: "var(--surface)", borderRadius: 16, padding: "26px 24px 22px", width: 380, maxWidth: "92vw", boxShadow: "var(--shadow-lg)" }}>
        <div
          className={`r-ic ${status}`}
          style={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: status === "success" ? "var(--success-weak)" : "var(--danger-weak)", color: status === "success" ? "var(--success)" : "var(--danger)" }}
        >
          <Check size={26} />
        </div>
        <h3 style={{ margin: "0 0 7px", fontSize: 17, fontWeight: 800 }}>{title}</h3>
        <p style={{ margin: "0 0 20px", color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.6 }}>{msg}</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn primary"
            style={{ minWidth: 120, justifyContent: "center" }}
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 기본 정보 탭 ─────────────────────────────────────────────────────────

// 현재 미사용 — 저장 트리거가 page header 패턴으로 이관되며 대체됨.
// (복원 계획이 없으면 삭제 대상. 훅 규칙상 이름은 대문자로 유지해야 함)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BasicTab() {
  const toast = useToast();

  const [store, setStore] = useState<StoreSettings | null>(null);
  const [meta, setMeta] = useState<StoreMetadata>({});
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [_dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // confirm/result 상태
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [_saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getStoreSettings();
      setStore(s);
      const m = s.metadata ?? {};
      setMeta(m);
      setName(s.name ?? "");
      setDomain((m.domain as string) ?? "");
      setEmail((m.contact_email as string) ?? "");
      setPhone((m.contact_phone as string) ?? "");
      setLogoUrl((m.logo_url as string) ?? "");
      setDirty(false);
    } catch (e) {
      toast.show((e as Error)?.message ?? "불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function markDirty() {
    setDirty(true);
  }

  async function doSave() {
    if (!store) return;
    setSaving(true);
    try {
      const nextMeta: StoreMetadata = {
        ...meta,
        domain: domain.trim() || undefined,
        contact_email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
      };
      await updateStore(store.id, { name: name.trim(), metadata: nextMeta });
      setDirty(false);
      setResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="card">
        <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
          불러오는 중…
        </div>
      </div>
    );

  return (
    <>
      <div className="card">
        <div className="card-pad">
          <div className="dsec-t">기본 정보</div>

          <div className="frow">
            <span className="field-l">쇼핑몰 이름</span>
            <input
              className="inp"
              value={name}
              onChange={(e) => { setName(e.target.value); markDirty(); }}
            />
          </div>

          <div className="frow">
            <span className="field-l">대표 도메인</span>
            <input
              className="inp"
              value={domain}
              onChange={(e) => { setDomain(e.target.value); markDirty(); }}
            />
          </div>

          <div className="frow">
            <div className="fgrid2">
              <div>
                <span className="field-l">대표 이메일</span>
                <input
                  className="inp"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); markDirty(); }}
                />
              </div>
              <div>
                <span className="field-l">고객센터</span>
                <input
                  className="inp"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); markDirty(); }}
                />
              </div>
            </div>
          </div>

          <div className="frow" style={{ marginBottom: 0 }}>
            <span className="field-l">로고</span>
            <div
              style={{
                width: 140,
                height: 56,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                fontSize: 12,
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Upload size={16} />
              로고 업로드
            </div>
          </div>
        </div>
      </div>

      {/* 저장 Confirm */}
      <ConfirmModal
        open={confirmOpen}
        title="설정을 저장하시겠습니까?"
        message="기본 정보 변경사항을 저장합니다."
        confirmText="변경사항 저장"
        meta={{
          target: "쇼핑몰 기본 설정",
          effect: "쇼핑몰 노출에 반영",
          reversible: true,
        }}
        onConfirm={async () => {
          setConfirmOpen(false);
          await doSave();
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* 저장 결과 */}
      <ResultModal
        open={resultOpen}
        status="success"
        title="저장했습니다."
        msg="설정 변경사항이 적용되었습니다."
        onClose={() => setResultOpen(false)}
      />

      {/* dirty 상태를 부모에게 알리기 위한 핵: 탭 밖에서 save 버튼이 쓸 수 있도록
          이 탭은 저장 버튼을 직접 가지지 않고 외부(page header)가 트리거함.
          하지만 page-level dirty 관리 패턴 상 탭 내부 confirm 트리거 함수를 노출해야 하므로,
          BasicTab은 자체 save-hint도 렌더링하지 않는다 (page header에서 처리). */}
    </>
  );
}

// ─── 다국어·통화 탭 ──────────────────────────────────────────────────────

function LangTab() {
  const [langs, setLangs] = useState<LangEntry[]>(DEFAULT_LANGS);
  const [confirmLang, setConfirmLang] = useState<LangEntry | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [pendingToggle, setPendingToggle] = useState<LangEntry | null>(null);

  function handleToggle(entry: LangEntry) {
    if (entry.code === "KR") return; // 기본 한국어는 끌 수 없음
    setPendingToggle(entry);
    setConfirmLang(entry);
  }

  function doToggle() {
    if (!pendingToggle) return;
    const next = langs.map((l) =>
      l.code === pendingToggle.code ? { ...l, on: !l.on } : l
    );
    setLangs(next);
    const toggled = next.find((l) => l.code === pendingToggle.code)!;
    setResultMsg(`${pendingToggle.name} 노출이 ${toggled.on ? "시작" : "중단"}되었습니다.`);
    setConfirmLang(null);
    setPendingToggle(null);
    setResultOpen(true);
  }

  return (
    <>
      <div className="card">
        <div className="card-pad">
          <div className="dsec-t">
            다국어 · 통화{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400, textTransform: "none" }}>
              · 기본 한국어 / KRW
            </span>
          </div>

          {langs.map((entry) => (
            <div className="dline" key={entry.code} data-lang-row>
              <span
                style={{
                  width: 34,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-3)",
                  letterSpacing: "0.04em",
                }}
              >
                {entry.code}
              </span>
              <span className="dl-t" style={{ flex: 1 }}>
                <b>{entry.name}</b>
              </span>
              {/* badge */}
              <span
                className={`badge ${entry.on ? "success" : "neutral"}`}
              >
                <span className="bdot" />
                {entry.on ? "노출" : "숨김"}
              </span>
              {/* toggle switch */}
              <span
                onClick={() => handleToggle(entry)}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 999,
                  background: entry.on ? "var(--primary)" : "var(--border-strong)",
                  position: "relative",
                  cursor: entry.code === "KR" ? "not-allowed" : "pointer",
                  flex: "0 0 auto",
                  display: "inline-block",
                }}
                className="lang-toggle"
                title={entry.code === "KR" ? "기본 언어는 변경할 수 없습니다" : ""}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    ...(entry.on ? { right: 3 } : { left: 3 }),
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
              </span>
            </div>
          ))}

          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
            언어 노출 변경은 실제 쇼핑몰에 즉시 반영되어 별도 확인을 거칩니다.
          </div>
        </div>
      </div>

      {/* 언어 토글 Confirm */}
      <ConfirmModal
        open={!!confirmLang}
        title={`${confirmLang?.name} 노출을 ${confirmLang?.on ? "중단" : "시작"}하시겠습니까?`}
        message="다국어·통화 설정은 실제 쇼핑몰 노출에 즉시 영향을 줍니다."
        confirmText={confirmLang?.on ? "노출 중단" : "노출 시작"}
        meta={{
          target: confirmLang?.name,
          effect: confirmLang?.on ? "고객 노출 중단" : "고객 노출 시작",
          reversible: true,
        }}
        onConfirm={doToggle}
        onCancel={() => { setConfirmLang(null); setPendingToggle(null); }}
      />

      {/* 결과 */}
      <ResultModal
        open={resultOpen}
        status="success"
        title="변경했습니다."
        msg={resultMsg}
        onClose={() => setResultOpen(false)}
      />
    </>
  );
}

// ─── 지역·세금 탭 ─────────────────────────────────────────────────────────

function RegionTaxTab() {
  const toast = useToast();

  // 지역 상태
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);

  // 세금 지역 상태
  const [taxRegions, setTaxRegions] = useState<TaxRegion[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);

  // 세율 편집 상태 (편집 중인 tax_rate id → 입력값)
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>("");

  // 지역명 편집 상태
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState<string>("");

  // 세율 저장 confirm 상태
  const [confirmRateOpen, setConfirmRateOpen] = useState(false);
  const [pendingRateSave, setPendingRateSave] = useState<{
    taxRateId: string;
    rate: number;
    taxRegionId: string;
  } | null>(null);
  const [rateResultOpen, setRateResultOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setRegionsLoading(true);
    setTaxLoading(true);
    try {
      const [regs, taxRegs] = await Promise.all([listRegions(), listTaxRegions()]);
      setRegions(regs);
      setTaxRegions(taxRegs);
    } catch (e) {
      toast.show((e as Error)?.message ?? "불러오기 실패", "danger");
    } finally {
      setRegionsLoading(false);
      setTaxLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 세율 편집 시작
  function startEditRate(taxRateId: string, currentRate: number | null) {
    setEditingRateId(taxRateId);
    setEditingRateValue(currentRate !== null ? String(currentRate) : "");
  }

  // 세율 저장 트리거
  function handleSaveRate(taxRateId: string, taxRegionId: string) {
    const errors = validateTaxRateInput({ rate: editingRateValue });
    if (errors.length > 0) {
      toast.show(errors[0].message, "danger");
      return;
    }
    const rate = parseFloat(editingRateValue);
    setPendingRateSave({ taxRateId, rate, taxRegionId });
    setConfirmRateOpen(true);
  }

  // 세율 저장 실행
  async function doSaveRate() {
    if (!pendingRateSave) return;
    setSaving(true);
    try {
      const updated = await updateTaxRate(pendingRateSave.taxRateId, {
        rate: pendingRateSave.rate,
      });
      setTaxRegions((prev) =>
        prev.map((tr) => ({
          ...tr,
          tax_rates: tr.tax_rates.map((r) =>
            r.id === pendingRateSave.taxRateId ? { ...r, rate: updated.tax_rate.rate } : r
          ),
        }))
      );
      setEditingRateId(null);
      setRateResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "세율 저장 실패", "danger");
    } finally {
      setSaving(false);
      setConfirmRateOpen(false);
      setPendingRateSave(null);
    }
  }

  // 지역명 편집 시작
  function startEditRegion(regionId: string, currentName: string) {
    setEditingRegionId(regionId);
    setEditingRegionName(currentName);
  }

  // 지역명 저장
  async function doSaveRegionName(regionId: string) {
    const errors = validateRegionNameInput(editingRegionName);
    if (errors.length > 0) {
      toast.show(errors[0].message, "danger");
      return;
    }
    try {
      await updateRegion(regionId, { name: editingRegionName.trim() });
      setRegions((prev) =>
        prev.map((r) => (r.id === regionId ? { ...r, name: editingRegionName.trim() } : r))
      );
      setEditingRegionId(null);
      toast.show("지역명을 저장했습니다.", "success");
    } catch (e) {
      toast.show((e as Error)?.message ?? "지역명 저장 실패", "danger");
    }
  }

  const isLoading = regionsLoading || taxLoading;

  return (
    <>
      {/* ─ 지역 카드 ─ */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad">
          <div className="dsec-t">
            지역{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400, textTransform: "none" }}>
              · 한국 단독몰 기준
            </span>
          </div>

          {isLoading ? (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
          ) : regions.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>
              등록된 지역이 없습니다.
            </div>
          ) : (
            regions.map((region) => (
              <div className="dline" key={region.id} data-region-id={region.id}>
                <span className="dl-t" style={{ flex: 1 }}>
                  {editingRegionId === region.id ? (
                    <input
                      className="inp"
                      style={{ maxWidth: 200, padding: "4px 8px", fontSize: 13 }}
                      value={editingRegionName}
                      onChange={(e) => setEditingRegionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") doSaveRegionName(region.id);
                        if (e.key === "Escape") setEditingRegionId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <b>{region.name}</b>
                  )}
                  <span style={{ color: "var(--text-3)", fontSize: 12, marginLeft: 8 }}>
                    {region.currency_code?.toUpperCase()}
                  </span>
                </span>
                {editingRegionId === region.id ? (
                  <span style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ padding: "4px 12px", fontSize: 12 }}
                      onClick={() => doSaveRegionName(region.id)}
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => setEditingRegionId(null)}
                    >
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => startEditRegion(region.id, region.name)}
                  >
                    편집
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─ 세금 지역 카드 ─ */}
      <div className="card">
        <div className="card-pad">
          <div className="dsec-t">
            세금 지역 · 세율{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400, textTransform: "none" }}>
              · 한국 VAT 기본 {KOREA_VAT_RATE}%
            </span>
          </div>

          {isLoading ? (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
          ) : taxRegions.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>
              등록된 세금 지역이 없습니다.
            </div>
          ) : (
            taxRegions.map((taxRegion) => (
              <div
                key={taxRegion.id}
                style={{ marginBottom: 16 }}
                data-tax-region-id={taxRegion.id}
              >
                {/* 세금 지역 헤더 */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-2)",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Globe size={14} />
                  {taxRegion.country_code?.toUpperCase()}
                  {taxRegion.province_code ? ` — ${taxRegion.province_code}` : ""}
                </div>

                {/* 세율 목록 */}
                {taxRegion.tax_rates.length === 0 ? (
                  <div style={{ color: "var(--text-3)", fontSize: 12, paddingLeft: 20 }}>
                    세율 없음
                  </div>
                ) : (
                  taxRegion.tax_rates.map((taxRate) => (
                    <div
                      className="dline"
                      key={taxRate.id}
                      data-tax-rate-id={taxRate.id}
                      style={{ paddingLeft: 20 }}
                    >
                      <span className="dl-t" style={{ flex: 1 }}>
                        <b>{taxRate.name}</b>
                        <span style={{ color: "var(--text-3)", fontSize: 12, marginLeft: 6 }}>
                          {taxRate.code}
                        </span>
                      </span>

                      {editingRateId === taxRate.id ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            className="inp"
                            style={{ width: 72, padding: "4px 8px", fontSize: 13, textAlign: "right" }}
                            value={editingRateValue}
                            onChange={(e) => setEditingRateValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveRate(taxRate.id, taxRegion.id);
                              if (e.key === "Escape") setEditingRateId(null);
                            }}
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            autoFocus
                          />
                          <span style={{ fontSize: 12, color: "var(--text-2)" }}>%</span>
                          <button
                            type="button"
                            className="btn primary"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => handleSaveRate(taxRate.id, taxRegion.id)}
                            disabled={saving}
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => setEditingRateId(null)}
                          >
                            취소
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            className={`badge ${taxRate.rate === KOREA_VAT_RATE ? "success" : "neutral"}`}
                            data-tax-rate-value={taxRate.rate}
                          >
                            <span className="bdot" />
                            {taxRate.rate !== null ? `${taxRate.rate}%` : "미설정"}
                          </span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => startEditRate(taxRate.id, taxRate.rate)}
                          >
                            편집
                          </button>
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ))
          )}

          <div className="log-note" style={{ marginTop: 8 }}>
            <Info size={15} />
            <span>
              세율 변경은 이후 생성되는 주문에 반영됩니다. 한국 VAT 기본 세율은{" "}
              {KOREA_VAT_RATE}%입니다.
            </span>
          </div>
        </div>
      </div>

      {/* 세율 저장 Confirm */}
      <ConfirmModal
        open={confirmRateOpen}
        title="세율을 변경하시겠습니까?"
        message={`세율을 ${pendingRateSave?.rate ?? ""}%로 변경합니다. 이후 생성 주문에 반영됩니다.`}
        confirmText="세율 변경"
        meta={{
          target: "세율",
          effect: "이후 주문 세액 계산 반영",
          reversible: true,
        }}
        onConfirm={doSaveRate}
        onCancel={() => {
          setConfirmRateOpen(false);
          setPendingRateSave(null);
        }}
      />

      {/* 세율 변경 결과 */}
      <ResultModal
        open={rateResultOpen}
        status="success"
        title="세율을 변경했습니다."
        msg="변경된 세율은 이후 생성되는 주문에 적용됩니다."
        onClose={() => setRateResultOpen(false)}
      />
    </>
  );
}

// ─── 배송·결제 탭 (플레이스홀더) ──────────────────────────────────────────

function ShippingTab() {
  return (
    <div className="card">
      <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
        배송·결제 설정은 별도 화면에서 관리합니다.
      </div>
    </div>
  );
}

// ─── 운영자 권한 탭 ────────────────────────────────────────────────────────

function RolesTab() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmRole, setConfirmRole] = useState<{ user: AdminUserRow; roleKey: RoleKey; roleLabel: string } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.users);
    } catch (e) {
      toast.show((e as Error)?.message ?? "운영자 목록 불러오기 실패", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function doChangeRole() {
    if (!confirmRole) return;
    try {
      await assignRole(confirmRole.user.id, confirmRole.roleKey);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmRole.user.id ? { ...u, role_key: confirmRole.roleKey } : u
        )
      );
      setResultMsg("변경 내역이 관리 로그에 기록되었습니다.");
      setResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "권한 변경 실패", "danger");
    } finally {
      setConfirmRole(null);
    }
  }

  function getInitial(user: AdminUserRow): string {
    if (user.name) return user.name.charAt(0);
    return user.email.charAt(0).toUpperCase();
  }

  if (loading)
    return (
      <div className="card">
        <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
          불러오는 중…
        </div>
      </div>
    );

  return (
    <>
      <div className="card">
        <div className="card-pad">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="dsec-t" style={{ margin: 0 }}>운영자 권한</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {users.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "12px 0" }}>
                등록된 운영자가 없습니다.
              </div>
            ) : (
              users.map((user) => {
                const isSuper = user.role_key === "super";
                const _currentLabel = user.role_key ? ROLE_LABELS[user.role_key] : "미지정";
                const ini = getInitial(user);
                return (
                  <div className="dline role-row" key={user.id} data-who={user.name ?? user.email}>
                    {/* 아바타 */}
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isSuper ? "#E0E7FF" : "var(--surface-2)",
                        color: isSuper ? "#3730A3" : "var(--text-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {ini}
                    </span>

                    {/* 이름 + 이메일 */}
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{user.name ?? user.email}</b>
                      {user.name ? <span>{user.email}</span> : null}
                    </span>

                    {/* 권한 표시 */}
                    {isSuper ? (
                      <span className="badge primary">
                        <span className="bdot" />
                        최고관리자
                      </span>
                    ) : (
                      <span className="role-pick">
                        {ROLE_OPTIONS.map((opt) => (
                          <span
                            key={opt.key}
                            className={`role-opt${user.role_key === opt.key ? " active" : ""}`}
                            onClick={() => {
                              if (user.role_key === opt.key) return;
                              setConfirmRole({ user, roleKey: opt.key, roleLabel: opt.label });
                            }}
                          >
                            {opt.label}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="log-note">
            <Info size={15} />
            <span>권한 변경 내역은 관리 로그에 기록되며, 변경 즉시 해당 운영자에게 적용됩니다.</span>
          </div>
        </div>
      </div>

      {/* 권한 변경 Confirm */}
      <ConfirmModal
        open={!!confirmRole}
        title="권한을 변경하시겠습니까?"
        message="운영자 권한을 변경합니다."
        confirmText="권한 변경"
        meta={{
          target: confirmRole ? `${confirmRole.user.name ?? confirmRole.user.email} → ${confirmRole.roleLabel}` : undefined,
          effect: "접근 가능 메뉴 변경",
          reversible: true,
        }}
        onConfirm={doChangeRole}
        onCancel={() => setConfirmRole(null)}
      />

      {/* 권한 변경 결과 */}
      <ResultModal
        open={resultOpen}
        status="success"
        title="권한을 변경했습니다."
        msg={resultMsg}
        onClose={() => setResultOpen(false)}
      />
    </>
  );
}

// ─── 알림 탭 (플레이스홀더) ────────────────────────────────────────────────

function NotifyTab() {
  return (
    <div className="card">
      <div className="card-pad" style={{ color: "var(--text-3)", fontSize: 13 }}>
        알림 설정은 별도 화면에서 관리합니다.
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────

export default function Page() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  // dirty / save 상태 (기본 정보 탭 연동)
  const [dirty, setDirty] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saveResultOpen, setSaveResultOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // store 정보 (page-level save 트리거를 위해 BasicTab과 공유)
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [meta, setMeta] = useState<StoreMetadata>({});
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [storeLoading, setStoreLoading] = useState(true);

  const loadStore = useCallback(async () => {
    setStoreLoading(true);
    try {
      const s = await getStoreSettings();
      setStore(s);
      const m = s.metadata ?? {};
      setMeta(m);
      setName(s.name ?? "");
      setDomain((m.domain as string) ?? "");
      setEmail((m.contact_email as string) ?? "");
      setPhone((m.contact_phone as string) ?? "");
      setDirty(false);
    } catch (e) {
      toast.show((e as Error)?.message ?? "불러오기 실패", "danger");
    } finally {
      setStoreLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  function markDirty() {
    setDirty(true);
  }

  async function doSave() {
    if (!store) return;
    // spec §4 입력 검증 (I1: 이름 1~100자, I2: 기본통화)
    const validationErrors = validateStoreInput({ name: name.trim() });
    if (validationErrors.length > 0) {
      toast.show(validationErrors[0].message, "danger");
      return;
    }
    setSaving(true);
    try {
      const nextMeta: StoreMetadata = {
        ...meta,
        domain: domain.trim() || undefined,
        contact_email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined,
      };
      await updateStore(store.id, { name: name.trim(), metadata: nextMeta });
      setDirty(false);
      setSaveResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "저장 실패", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="scr">
      <div className="wrap c-form">
        {/* ① 페이지 헤더 */}
        <div className="page-header">
          <div className="ph-l">
            <h1>쇼핑몰 설정</h1>
            <div className="ph-sub">기본 정보 · 다국어 · 운영자 권한</div>
          </div>
          <div className="ph-actions">
            <span
              className={`save-hint${dirty ? " dirty" : ""}`}
              id="saveHint"
            >
              {dirty ? "저장하지 않은 변경사항" : "변경사항 없음"}
            </span>
            <button
              type="button"
              className={`btn primary${!dirty || saving ? " is-disabled" : ""}`}
              id="settingsSave"
              onClick={() => {
                if (!dirty) return;
                setSaveConfirmOpen(true);
              }}
              disabled={!dirty || saving}
            >
              <Check size={16} />
              <span>변경사항 저장</span>
            </button>
          </div>
        </div>

        {/* ② 탭 네비게이션 */}
        <div className="card mb16">
          <div className="segtabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`segtab${activeTab === id ? " active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ③ 콘텐츠 영역 */}
        {activeTab === "basic" && (
          <div className="settings-grid">
            {/* LEFT: 기본 정보 카드 */}
            <div className="card">
              <div className="card-pad">
                <div className="dsec-t">기본 정보</div>

                {storeLoading ? (
                  <div style={{ color: "var(--text-3)", fontSize: 13 }}>불러오는 중…</div>
                ) : (
                  <>
                    <div className="frow">
                      <span className="field-l">쇼핑몰 이름</span>
                      <input
                        className="inp"
                        value={name}
                        onChange={(e) => { setName(e.target.value); markDirty(); }}
                      />
                    </div>

                    <div className="frow">
                      <span className="field-l">대표 도메인</span>
                      <input
                        className="inp"
                        value={domain}
                        onChange={(e) => { setDomain(e.target.value); markDirty(); }}
                      />
                    </div>

                    <div className="frow">
                      <div className="fgrid2">
                        <div>
                          <span className="field-l">대표 이메일</span>
                          <input
                            className="inp"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); markDirty(); }}
                          />
                        </div>
                        <div>
                          <span className="field-l">고객센터</span>
                          <input
                            className="inp"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); markDirty(); }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="frow" style={{ marginBottom: 0 }}>
                      <span className="field-l">로고</span>
                      <div
                        style={{
                          width: 140,
                          height: 56,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          background: "var(--surface-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-3)",
                          fontSize: 12,
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={16} />
                        로고 업로드
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: 다국어·통화 + 운영자 권한 */}
            <RightColumn />
          </div>
        )}

        {activeTab === "lang" && <LangTab />}
        {activeTab === "region-tax" && <RegionTaxTab />}
        {activeTab === "shipping" && <ShippingTab />}
        {activeTab === "roles" && <RolesTab />}
        {activeTab === "notify" && <NotifyTab />}
      </div>

      {/* 저장 Confirm (page-level, basic 탭 전용) */}
      <ConfirmModal
        open={saveConfirmOpen}
        title="설정을 저장하시겠습니까?"
        message="기본 정보 변경사항을 저장합니다."
        confirmText="변경사항 저장"
        meta={{
          target: "쇼핑몰 기본 설정",
          effect: "쇼핑몰 노출에 반영",
          reversible: true,
        }}
        onConfirm={async () => {
          setSaveConfirmOpen(false);
          await doSave();
        }}
        onCancel={() => setSaveConfirmOpen(false)}
      />

      {/* 저장 결과 */}
      <ResultModal
        open={saveResultOpen}
        status="success"
        title="저장했습니다."
        msg="설정 변경사항이 적용되었습니다."
        onClose={() => setSaveResultOpen(false)}
      />
    </div>
  );
}

// ─── RIGHT 컬럼 (기본 정보 탭 전용) ─────────────────────────────────────

function RightColumn() {
  const toast = useToast();
  const [langs, setLangs] = useState<LangEntry[]>(DEFAULT_LANGS);
  const [confirmLang, setConfirmLang] = useState<LangEntry | null>(null);
  const [pendingToggle, setPendingToggle] = useState<LangEntry | null>(null);
  const [langResultOpen, setLangResultOpen] = useState(false);
  const [langResultMsg, setLangResultMsg] = useState("");

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [confirmRole, setConfirmRole] = useState<{ user: AdminUserRow; roleKey: RoleKey; roleLabel: string } | null>(null);
  const [roleResultOpen, setRoleResultOpen] = useState(false);

  useEffect(() => {
    getUsers()
      .then((res) => setUsers(res.users))
      .catch((e) => toast.show((e as Error)?.message ?? "운영자 목록 불러오기 실패", "danger"))
      .finally(() => setUsersLoading(false));
  }, [toast]);

  function handleToggle(entry: LangEntry) {
    if (entry.code === "KR") return;
    setPendingToggle(entry);
    setConfirmLang(entry);
  }

  function doLangToggle() {
    if (!pendingToggle) return;
    const next = langs.map((l) =>
      l.code === pendingToggle.code ? { ...l, on: !l.on } : l
    );
    setLangs(next);
    const toggled = next.find((l) => l.code === pendingToggle.code)!;
    setLangResultMsg(`${pendingToggle.name} 노출이 ${toggled.on ? "시작" : "중단"}되었습니다.`);
    setConfirmLang(null);
    setPendingToggle(null);
    setLangResultOpen(true);
  }

  async function doChangeRole() {
    if (!confirmRole) return;
    try {
      await assignRole(confirmRole.user.id, confirmRole.roleKey);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmRole.user.id ? { ...u, role_key: confirmRole.roleKey } : u
        )
      );
      setRoleResultOpen(true);
    } catch (e) {
      toast.show((e as Error)?.message ?? "권한 변경 실패", "danger");
    } finally {
      setConfirmRole(null);
    }
  }

  function getInitial(user: AdminUserRow): string {
    if (user.name) return user.name.charAt(0);
    return user.email.charAt(0).toUpperCase();
  }

  return (
    <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
      {/* 다국어·통화 카드 */}
      <div className="card">
        <div className="card-pad">
          <div className="dsec-t">
            다국어 · 통화{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400, textTransform: "none" }}>
              · 기본 한국어 / KRW
            </span>
          </div>

          {langs.map((entry) => (
            <div className="dline" key={entry.code}>
              <span
                style={{
                  width: 34,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-3)",
                  letterSpacing: "0.04em",
                }}
              >
                {entry.code}
              </span>
              <span className="dl-t" style={{ flex: 1 }}>
                <b>{entry.name}</b>
              </span>
              <span className={`badge ${entry.on ? "success" : "neutral"}`}>
                <span className="bdot" />
                {entry.on ? "노출" : "숨김"}
              </span>
              <span
                onClick={() => handleToggle(entry)}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 999,
                  background: entry.on ? "var(--primary)" : "var(--border-strong)",
                  position: "relative",
                  cursor: entry.code === "KR" ? "not-allowed" : "pointer",
                  flex: "0 0 auto",
                  display: "inline-block",
                }}
                className="lang-toggle"
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    ...(entry.on ? { right: 3 } : { left: 3 }),
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
              </span>
            </div>
          ))}

          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
            언어 노출 변경은 실제 쇼핑몰에 즉시 반영되어 별도 확인을 거칩니다.
          </div>
        </div>
      </div>

      {/* 운영자 권한 카드 */}
      <div className="card">
        <div className="card-pad">
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="dsec-t" style={{ margin: 0 }}>운영자 권한</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {usersLoading ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>불러오는 중…</div>
            ) : users.length === 0 ? (
              <div style={{ color: "var(--text-3)", fontSize: 13, padding: "8px 0" }}>
                등록된 운영자가 없습니다.
              </div>
            ) : (
              users.map((user) => {
                const isSuper = user.role_key === "super";
                return (
                  <div className="dline role-row" key={user.id} data-who={user.name ?? user.email}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isSuper ? "#E0E7FF" : "var(--surface-2)",
                        color: isSuper ? "#3730A3" : "var(--text-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {getInitial(user)}
                    </span>
                    <span className="dl-t" style={{ flex: 1 }}>
                      <b>{user.name ?? user.email}</b>
                      {user.name ? <span>{user.email}</span> : null}
                    </span>
                    {isSuper ? (
                      <span className="badge primary">
                        <span className="bdot" />
                        최고관리자
                      </span>
                    ) : (
                      <span className="role-pick">
                        {ROLE_OPTIONS.map((opt) => (
                          <span
                            key={opt.key}
                            className={`role-opt${user.role_key === opt.key ? " active" : ""}`}
                            onClick={() => {
                              if (user.role_key === opt.key) return;
                              setConfirmRole({ user, roleKey: opt.key, roleLabel: opt.label });
                            }}
                          >
                            {opt.label}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="log-note">
            <Info size={15} />
            <span>권한 변경 내역은 관리 로그에 기록되며, 변경 즉시 해당 운영자에게 적용됩니다.</span>
          </div>
        </div>
      </div>

      {/* 언어 토글 Confirm */}
      <ConfirmModal
        open={!!confirmLang}
        title={`${confirmLang?.name} 노출을 ${confirmLang?.on ? "중단" : "시작"}하시겠습니까?`}
        message="다국어·통화 설정은 실제 쇼핑몰 노출에 즉시 영향을 줍니다."
        confirmText={confirmLang?.on ? "노출 중단" : "노출 시작"}
        meta={{
          target: confirmLang?.name,
          effect: confirmLang?.on ? "고객 노출 중단" : "고객 노출 시작",
          reversible: true,
        }}
        onConfirm={doLangToggle}
        onCancel={() => { setConfirmLang(null); setPendingToggle(null); }}
      />

      {/* 언어 변경 결과 */}
      <ResultModal
        open={langResultOpen}
        status="success"
        title="변경했습니다."
        msg={langResultMsg}
        onClose={() => setLangResultOpen(false)}
      />

      {/* 권한 변경 Confirm */}
      <ConfirmModal
        open={!!confirmRole}
        title="권한을 변경하시겠습니까?"
        message="운영자 권한을 변경합니다."
        confirmText="권한 변경"
        meta={{
          target: confirmRole ? `${confirmRole.user.name ?? confirmRole.user.email} → ${confirmRole.roleLabel}` : undefined,
          effect: "접근 가능 메뉴 변경",
          reversible: true,
        }}
        onConfirm={doChangeRole}
        onCancel={() => setConfirmRole(null)}
      />

      {/* 권한 변경 결과 */}
      <ResultModal
        open={roleResultOpen}
        status="success"
        title="권한을 변경했습니다."
        msg="변경 내역이 관리 로그에 기록되었습니다."
        onClose={() => setRoleResultOpen(false)}
      />
    </div>
  );
}

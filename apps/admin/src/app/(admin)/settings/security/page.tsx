"use client";

/**
 * 관리자 2단계 인증(2FA/TOTP) 설정 — 무비용, 옵트인.
 *
 * 흐름:
 *  1) 현재 상태 조회(/admin/2fa)
 *  2) [등록 시작] → /admin/2fa/setup 으로 시크릿 + QR 발급
 *     - 인증앱(Google Authenticator, Authy 등)으로 QR 스캔 또는 "설정 키 직접 입력"
 *  3) 앱에 표시된 6자리 코드 입력 → /admin/2fa/activate 로 활성화(백업 코드 발급)
 *  4) [해제]는 언제든 가능(/admin/2fa DELETE)
 *
 * ※ QR은 서버측 순수 JS 인코더(무비용·무네트워크·CSP 안전)로 생성한 인라인 SVG.
 */
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Copy, Check, KeyRound } from "lucide-react";
import { ConfirmModal, useToast, PageHeader } from "@/components/ui";
import {
  getTwoFactorStatus,
  setupTwoFactor,
  activateTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
  type TwoFactorStatus,
} from "@/lib/api/two-factor";

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.show("복사에 실패했습니다. 직접 선택해 복사해 주세요.", "danger");
    }
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <code
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 8,
            fontSize: 13,
            wordBreak: "break-all",
            fontFamily: "monospace",
          }}
        >
          {value}
        </code>
        <button
          onClick={copy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 12px",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}

export default function SecurityTwoFactorPage() {
  const toast = useToast();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  // 백업 코드(활성화·재발급 직후 1회 노출)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [regenCode, setRegenCode] = useState("");
  const [showRegen, setShowRegen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getTwoFactorStatus());
    } catch {
      toast.show("2FA 상태를 불러오지 못했습니다.", "danger");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await setupTwoFactor();
      setSecret(r.secret);
      setOtpauthUri(r.otpauth_uri);
      setQrSvg(r.qr_svg ?? "");
      setCode("");
    } catch {
      toast.show("등록 시작에 실패했습니다.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    if (code.trim().length !== 6) {
      toast.show("6자리 인증 코드를 입력해 주세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      const r = await activateTwoFactor(code.trim());
      toast.show("2단계 인증이 활성화되었습니다.", "success");
      setSecret(null);
      setOtpauthUri("");
      setQrSvg("");
      setCode("");
      setBackupCodes(r.backup_codes ?? []);
      await load();
    } catch {
      toast.show("인증 코드가 올바르지 않습니다. 다시 시도해 주세요.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const doRegenerate = async () => {
    if (regenCode.trim().length !== 6) {
      toast.show("6자리 인증 코드를 입력해 주세요.", "danger");
      return;
    }
    setBusy(true);
    try {
      const r = await regenerateBackupCodes(regenCode.trim());
      setBackupCodes(r.backup_codes ?? []);
      setShowRegen(false);
      setRegenCode("");
      toast.show("백업 코드를 재발급했습니다. 이전 코드는 무효화됩니다.", "success");
      await load();
    } catch {
      toast.show("인증 코드가 올바르지 않습니다.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const doDisable = async () => {
    setBusy(true);
    try {
      await disableTwoFactor();
      toast.show("2단계 인증이 해제되었습니다.", "success");
      setSecret(null);
      setOtpauthUri("");
      setQrSvg("");
      setBackupCodes(null);
      await load();
    } catch {
      toast.show("해제에 실패했습니다.", "danger");
    } finally {
      setBusy(false);
      setConfirmDisable(false);
    }
  };

  const enabled = status?.enabled ?? false;

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader
        title="2단계 인증 (2FA)"
        sub="관리자 계정에 인증앱(OTP) 기반 2단계 인증을 적용합니다. 계정별 개별 설정이며, 활성화하면 로그인 시 6자리 코드가 추가로 필요합니다."
        gap="B"
      />

      {/* 현재 상태 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 16,
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 12,
          marginBottom: 20,
          background: enabled ? "#f0fdf4" : "#fff",
        }}
      >
        {enabled ? (
          <ShieldCheck size={28} color="#16a34a" />
        ) : (
          <ShieldAlert size={28} color="#d97706" />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {loading ? "확인 중…" : enabled ? "활성화됨" : "비활성화"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            {enabled
              ? "이 계정은 2단계 인증으로 보호되고 있습니다."
              : "보안 강화를 위해 2단계 인증을 활성화하는 것을 권장합니다."}
          </div>
        </div>
        {enabled && !loading && (
          <button
            onClick={() => setConfirmDisable(true)}
            disabled={busy}
            style={{
              padding: "8px 16px",
              border: "1px solid #fecaca",
              color: "#dc2626",
              background: "#fff",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            해제
          </button>
        )}
      </div>

      {/* 백업 코드 노출(활성화·재발급 직후 1회) */}
      {backupCodes && (
        <div
          style={{
            padding: 20,
            border: "2px solid #f59e0b",
            borderRadius: 12,
            marginBottom: 20,
            background: "#fffbeb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <KeyRound size={18} color="#b45309" />
            <span style={{ fontWeight: 700 }}>백업 코드 (지금 저장하세요)</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>
            인증앱을 사용할 수 없을 때 각 코드로 <b>1회</b> 로그인할 수 있습니다.
            이 화면을 벗어나면 다시 볼 수 없으니 안전한 곳에 보관하세요.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
              fontFamily: "monospace",
              fontSize: 15,
              marginBottom: 12,
            }}
          >
            {backupCodes.map((c) => (
              <div
                key={c}
                style={{
                  padding: "8px 12px",
                  background: "#fff",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 6,
                  textAlign: "center",
                  letterSpacing: 1,
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                navigator.clipboard
                  ?.writeText(backupCodes.join("\n"))
                  .then(() => toast.show("백업 코드를 복사했습니다.", "success"))
                  .catch(() => toast.show("복사에 실패했습니다.", "danger"));
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Copy size={14} /> 전체 복사
            </button>
            <button
              onClick={() => setBackupCodes(null)}
              style={{
                padding: "8px 14px",
                border: "none",
                borderRadius: 8,
                background: "var(--primary, #4f46e5)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              저장했습니다
            </button>
          </div>
        </div>
      )}

      {/* 활성 상태 관리 — 남은 백업 코드 + 재발급 */}
      {enabled && !loading && !backupCodes && (
        <div
          style={{
            padding: 16,
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>백업 코드</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                남은 코드 {status?.backup_codes_remaining ?? 0}개
                {(status?.backup_codes_remaining ?? 0) <= 2 && (
                  <span style={{ color: "#dc2626", marginLeft: 6 }}>
                    코드가 얼마 남지 않았습니다. 재발급을 권장합니다.
                  </span>
                )}
              </div>
            </div>
            {!showRegen && (
              <button
                onClick={() => setShowRegen(true)}
                disabled={busy}
                style={{
                  padding: "8px 14px",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 8,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                재발급
              </button>
            )}
          </div>
          {showRegen && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                현재 인증 코드 입력:
              </span>
              <input
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                style={{
                  width: 110,
                  padding: "8px 10px",
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 8,
                  fontSize: 15,
                  letterSpacing: 3,
                  textAlign: "center",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={doRegenerate}
                disabled={busy || regenCode.length !== 6}
                style={{
                  padding: "8px 14px",
                  border: "none",
                  borderRadius: 8,
                  background: regenCode.length === 6 ? "var(--primary, #4f46e5)" : "#cbd5e1",
                  color: "#fff",
                  cursor: regenCode.length === 6 ? "pointer" : "not-allowed",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                재발급
              </button>
              <button
                onClick={() => {
                  setShowRegen(false);
                  setRegenCode("");
                }}
                style={{
                  padding: "8px 10px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}

      {/* 등록 플로우 */}
      {!enabled && !loading && (
        <div
          style={{
            padding: 20,
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 12,
          }}
        >
          {!secret ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>등록 방법</div>
              <ol style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.8, paddingLeft: 18, marginBottom: 16 }}>
                <li>스마트폰에 인증앱(Google Authenticator, Authy 등)을 설치합니다.</li>
                <li>아래 <b>[등록 시작]</b> 버튼을 누르면 QR 코드와 설정 키가 발급됩니다.</li>
                <li>인증앱으로 QR을 스캔하거나 &ldquo;설정 키 직접 입력&rdquo;으로 등록합니다.</li>
                <li>앱에 표시된 6자리 코드를 입력해 활성화하고, 발급되는 <b>백업 코드</b>를 보관합니다.</li>
              </ol>
              <button
                onClick={startSetup}
                disabled={busy}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  background: "var(--primary, #4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <KeyRound size={16} />
                등록 시작
              </button>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>인증앱에 등록</div>
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>
                인증앱으로 아래 <b>QR 코드</b>를 스캔하거나, QR을 쓸 수 없으면
                <b>&ldquo;설정 키 직접 입력&rdquo;</b>으로 설정 키를 입력하세요.
              </p>
              {qrSvg && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      background: "#fff",
                      border: "1px solid var(--border, #e2e8f0)",
                      borderRadius: 12,
                      lineHeight: 0,
                    }}
                    // 서버에서 생성한 신뢰 가능한 정적 SVG(외부 입력 아님).
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                </div>
              )}
              <CopyBox label="설정 키 (Secret)" value={secret} />
              <details style={{ marginBottom: 16 }}>
                <summary style={{ fontSize: 12, color: "var(--text-3)", cursor: "pointer" }}>
                  otpauth URI (QR 지원 앱용)
                </summary>
                <div style={{ marginTop: 8 }}>
                  <CopyBox label="otpauth URI" value={otpauthUri} />
                </div>
              </details>

              <div style={{ fontWeight: 600, marginBottom: 8 }}>6자리 코드 입력</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{
                    width: 140,
                    padding: "10px 12px",
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 8,
                    fontSize: 18,
                    letterSpacing: 4,
                    textAlign: "center",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={activate}
                  disabled={busy || code.length !== 6}
                  style={{
                    padding: "10px 18px",
                    background: code.length === 6 ? "var(--primary, #4f46e5)" : "#cbd5e1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: code.length === 6 ? "pointer" : "not-allowed",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  활성화
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {confirmDisable && (
        <ConfirmModal
          open
          title="2단계 인증 해제"
          message="정말 2단계 인증을 해제하시겠습니까? 계정 보안이 약해집니다."
          confirmText="해제"
          danger
          onConfirm={doDisable}
          onCancel={() => setConfirmDisable(false)}
        />
      )}
    </div>
  );
}

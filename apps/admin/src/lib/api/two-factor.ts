/**
 * 관리자 2단계 인증(2FA/TOTP) API — 무비용, 옵트인.
 * 백엔드: /admin/2fa (GET 상태, DELETE 해제), /admin/2fa/setup, /admin/2fa/activate
 *
 *  - status:   현재 로그인 관리자의 2FA 활성/등록 여부
 *  - setup:    시크릿 발급(otpauth_uri 로 QR 생성) — 아직 미활성
 *  - activate: 인증앱 코드 검증 후 활성화
 *  - disable:  2FA 해제
 */
import { apiFetch } from "./client";

export type TwoFactorStatus = {
  enabled: boolean;
  enrolled: boolean;
  backup_codes_remaining: number;
};
export type TwoFactorSetup = {
  secret: string;
  otpauth_uri: string;
  qr_svg: string;
};

export function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return apiFetch<TwoFactorStatus>("/admin/2fa", { method: "GET" });
}

export function setupTwoFactor(): Promise<TwoFactorSetup> {
  return apiFetch<TwoFactorSetup>("/admin/2fa/setup", { method: "POST", body: "{}" });
}

export function activateTwoFactor(
  code: string
): Promise<{ enabled: boolean; backup_codes: string[] }> {
  return apiFetch<{ enabled: boolean; backup_codes: string[] }>(
    "/admin/2fa/activate",
    { method: "POST", body: JSON.stringify({ code }) }
  );
}

/** 백업 코드 재발급 — 현재 TOTP 코드 확인 필요. */
export function regenerateBackupCodes(
  code: string
): Promise<{ backup_codes: string[] }> {
  return apiFetch<{ backup_codes: string[] }>("/admin/2fa/backup-codes", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function disableTwoFactor(): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>("/admin/2fa", { method: "DELETE" });
}

/** 로그인 2단계 — 비밀번호 통과 후 OTP 코드 검증. 불일치 시 401. */
export function verifyTwoFactor(
  code: string
): Promise<{ verified: boolean; required: boolean }> {
  return apiFetch<{ verified: boolean; required: boolean }>("/admin/2fa/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

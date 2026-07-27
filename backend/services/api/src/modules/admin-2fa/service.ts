import { MedusaService } from "@medusajs/framework/utils"
import crypto from "crypto"
import AdminTotp from "./models/admin-totp"
import AdminTotpSession from "./models/admin-totp-session"
import Admin2faBackupCode from "./models/admin-2fa-backup-code"

/** 검증 세션 기본 유효시간(24h) — 이후 재-OTP 필요. */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
/** 활성화 시 발급하는 백업 코드 개수. */
const BACKUP_CODE_COUNT = 10

/** 로그인 Bearer 토큰 → sha256 hex(원문 미저장). */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/** 백업 코드 페퍼 키(보안점검 2026-07-27 M7) — 전용 2FA 키 우선. DB-only 유출 시 해시 무력화 방어. */
function pepperKey(): string {
  return process.env.ADMIN_2FA_SECRET_KEY || process.env.COOKIE_SECRET || "dev-insecure-2fa-key"
}
function normalizeCode(code: string): string {
  return String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")
}
/** 백업 코드 해시 — HMAC-SHA256 페퍼(서버 키). 무염 sha256 대비 DB 단독 유출 방어. */
function hashBackupCode(code: string): string {
  return crypto.createHmac("sha256", pepperKey()).update(normalizeCode(code)).digest("hex")
}
/** 레거시 무페퍼 sha256 해시 — 기존 발급 코드 하위호환 검증용. */
function legacyHashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(normalizeCode(code)).digest("hex")
}

/** 사람이 읽기 쉬운 1회용 코드(예: A1B2-C3D4). */
function randomBackupCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // 혼동 문자(0/O/1/I/L) 제외
  const pick = () =>
    Array.from(crypto.randomBytes(4))
      .map((b) => alphabet[b % alphabet.length])
      .join("")
  return `${pick()}-${pick()}`
}

class Admin2faModuleService extends MedusaService({
  AdminTotp,
  AdminTotpSession,
  Admin2faBackupCode,
}) {
  /** user별 TOTP 레코드 조회(없으면 null). */
  async getByUser(userId: string): Promise<any | null> {
    const rows = await this.listAdminTotps({ user_id: userId })
    return rows[0] ?? null
  }

  // ─── 검증 세션(서버측 게이팅) ───────────────────────────────────────────────

  /** 토큰을 2FA 검증됨으로 표기(만료시간 부여). 기존 동일 토큰 세션은 갱신. */
  async markTokenVerified(
    userId: string,
    token: string,
    ttlMs: number = SESSION_TTL_MS
  ): Promise<void> {
    const token_hash = hashToken(token)
    const expires_at = new Date(Date.now() + ttlMs)
    const existing = await this.listAdminTotpSessions({ token_hash })
    if (existing.length > 0) {
      await this.updateAdminTotpSessions([
        { id: existing[0].id, user_id: userId, expires_at },
      ])
      return
    }
    await this.createAdminTotpSessions([{ user_id: userId, token_hash, expires_at }])
  }

  /** 토큰이 2FA 검증 완료 + 미만료 상태인지 판정. */
  async isTokenVerified(userId: string, token: string): Promise<boolean> {
    const token_hash = hashToken(token)
    const rows = await this.listAdminTotpSessions({ token_hash, user_id: userId })
    if (!rows.length) return false
    const exp = rows[0].expires_at
    const expMs = exp instanceof Date ? exp.getTime() : new Date(exp).getTime()
    return expMs > Date.now()
  }

  /** 해당 user의 모든 검증 세션 폐기(2FA 해제/비번 변경 시). */
  async revokeSessions(userId: string): Promise<void> {
    const rows = await this.listAdminTotpSessions({ user_id: userId })
    if (rows.length) await this.deleteAdminTotpSessions(rows.map((r: any) => r.id))
  }

  // ─── 백업(복구) 코드 ────────────────────────────────────────────────────────

  /**
   * 백업 코드 재발급 — 기존 코드 전량 폐기 후 N개 새로 생성.
   * @returns 원문 코드 배열(이 시점에만 노출, 저장은 해시).
   */
  async generateBackupCodes(userId: string): Promise<string[]> {
    const old = await this.listAdmin2faBackupCodes({ user_id: userId })
    if (old.length) await this.deleteAdmin2faBackupCodes(old.map((r: any) => r.id))
    const codes: string[] = []
    const rows: { user_id: string; code_hash: string }[] = []
    while (codes.length < BACKUP_CODE_COUNT) {
      const c = randomBackupCode()
      if (codes.includes(c)) continue
      codes.push(c)
      rows.push({ user_id: userId, code_hash: hashBackupCode(c) })
    }
    await this.createAdmin2faBackupCodes(rows)
    return codes
  }

  /** 남은(미사용) 백업 코드 개수. */
  async countBackupCodes(userId: string): Promise<number> {
    const rows = await this.listAdmin2faBackupCodes({ user_id: userId, used: false })
    return rows.length
  }

  /**
   * 백업 코드 1개 소진 검증.
   * @returns 일치하는 미사용 코드가 있으면 소진 후 true.
   */
  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    // 신규(HMAC 페퍼) 우선, 없으면 레거시(무염 sha256)로 하위호환 검증
    for (const code_hash of [hashBackupCode(code), legacyHashBackupCode(code)]) {
      const rows = await this.listAdmin2faBackupCodes({
        user_id: userId,
        code_hash,
        used: false,
      })
      if (rows.length) {
        await this.updateAdmin2faBackupCodes([{ id: rows[0].id, used: true }])
        return true
      }
    }
    return false
  }

  /** 해당 user의 모든 백업 코드 폐기(2FA 해제 시). */
  async revokeBackupCodes(userId: string): Promise<void> {
    const rows = await this.listAdmin2faBackupCodes({ user_id: userId })
    if (rows.length) await this.deleteAdmin2faBackupCodes(rows.map((r: any) => r.id))
  }
}

export default Admin2faModuleService

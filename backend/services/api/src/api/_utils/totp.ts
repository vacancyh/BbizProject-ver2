/**
 * TOTP(RFC 6238) 순수 구현 — 외부 서비스/유료 라이브러리 불필요(Node crypto만 사용).
 * 관리자 2단계 인증(2FA)용. Google Authenticator 등 표준 앱과 호환.
 */
import crypto from "crypto"

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/** base32 인코딩(시크릿 표시용). */
export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ""
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

/** base32 디코딩. */
function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** 새 TOTP 시크릿 생성(base32, 20바이트). */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20))
}

/** HOTP(카운터 기반 6자리). */
function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac("sha1", key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(bin % 1_000_000).padStart(6, "0")
}

/** TOTP 코드 검증(±window*30초 허용, 기본 ±1). */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  if (!secret || !/^\d{6}$/.test(String(code).trim())) return false
  const key = base32Decode(secret)
  const step = Math.floor(Date.now() / 1000 / 30)
  const target = String(code).trim()
  for (let i = -window; i <= window; i++) {
    if (hotp(key, step + i) === target) return true
  }
  return false
}

/** 인증앱 등록용 otpauth URI(QR 인코딩용). */
export function otpauthUri(secret: string, account: string, issuer = "쇼핑몰 관리자"): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

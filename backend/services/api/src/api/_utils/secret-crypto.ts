/**
 * 대칭 암호화 유틸 — 2FA 시크릿 등 민감값 at-rest 암호화(AES-256-GCM).
 *
 *  - 키: env ADMIN_2FA_SECRET_KEY > COOKIE_SECRET > 개발용 폴백. sha256 으로 32바이트 파생.
 *  - 형식: "v1:" + base64(iv[12]) + "." + base64(tag[16]) + "." + base64(ciphertext)
 *  - decrypt: v1 접두어가 없으면 평문(레거시)으로 간주해 그대로 반환(무중단 마이그레이션).
 *
 * ⚠️ 운영: 전용 키(ADMIN_2FA_SECRET_KEY)를 KMS/Secrets Manager 로 주입하고 로테이션 정책 수립 권장.
 */
import crypto from "crypto"

const PREFIX = "v1:"

function key(): Buffer {
  const raw =
    process.env.ADMIN_2FA_SECRET_KEY ||
    process.env.COOKIE_SECRET ||
    "dev-insecure-2fa-key"
  return crypto.createHash("sha256").update(raw).digest()
}

/** 평문 → "v1:iv.tag.ct" (base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv)
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return (
    PREFIX +
    iv.toString("base64") +
    "." +
    tag.toString("base64") +
    "." +
    ct.toString("base64")
  )
}

/** "v1:iv.tag.ct" → 평문. v1 접두어 없으면 레거시 평문으로 간주(그대로 반환). */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored
  try {
    const [ivB, tagB, ctB] = stored.slice(PREFIX.length).split(".")
    const iv = Buffer.from(ivB, "base64")
    const tag = Buffer.from(tagB, "base64")
    const ct = Buffer.from(ctB, "base64")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
  } catch {
    // 복호화 실패(키 변경 등) → 빈 문자열(검증 실패로 이어져 안전측)
    return ""
  }
}

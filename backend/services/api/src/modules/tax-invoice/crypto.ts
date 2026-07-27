/**
 * PII 필드 at-rest 암호화 유틸(AES-256-GCM) — 보안점검 2026-07-27(H5).
 *  - 키: env PII_ENCRYPTION_KEY (운영 필수, 미설정 시 부팅/사용 실패) > COOKIE_SECRET/dev 폴백(개발 전용).
 *  - 형식: "pii1:" + base64(iv[12]).base64(tag[16]).base64(ct)
 *  - decryptPii: 접두어 없으면 레거시 평문으로 간주해 그대로 반환(무중단 마이그레이션).
 *
 * ⚠️ 운영: 전용 키를 KMS/Secrets Manager 로 주입 + 로테이션 정책 수립.
 */
import crypto from "crypto"

const PREFIX = "pii1:"
let warned = false

function key(): Buffer {
  const dedicated = process.env.PII_ENCRYPTION_KEY
  if (!dedicated && process.env.NODE_ENV === "production") {
    throw new Error("[security] PII_ENCRYPTION_KEY must be set in production (PII at-rest encryption key)")
  }
  if (!dedicated && !warned) {
    warned = true
    // eslint-disable-next-line no-console
    console.warn("[security] PII_ENCRYPTION_KEY 미설정 — dev 폴백 사용(개발 전용). 운영은 전용 키 필수.")
  }
  const raw = dedicated || process.env.COOKIE_SECRET || "dev-insecure-pii-key"
  return crypto.createHash("sha256").update(raw).digest()
}

/** 평문 → "pii1:iv.tag.ct"(base64). 빈값/null 은 그대로. */
export function encryptPii(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return (plain ?? null) as null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv)
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`
}

/** "pii1:..." → 평문. 접두어 없으면 레거시 평문으로 간주해 그대로 반환. 실패 시 빈 문자열. */
export function decryptPii(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null
  if (!String(stored).startsWith(PREFIX)) return stored as string
  try {
    const [ivB, tagB, ctB] = String(stored).slice(PREFIX.length).split(".")
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"))
    decipher.setAuthTag(Buffer.from(tagB, "base64"))
    return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8")
  } catch {
    return ""
  }
}

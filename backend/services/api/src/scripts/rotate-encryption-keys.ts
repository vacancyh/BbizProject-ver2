// 암호화 키 교체(로테이션) — 기존 암호문을 **옛 키로 풀어 새 키로 다시 잠근다**. (2026-08-04 신설)
//
// ── 왜 필요한가 ────────────────────────────────────────────────────────────
// at-rest 암호화 두 곳은 키를 sha256 으로 파생해 AES-256-GCM 으로 잠근다.
//   · 관리자 2FA 시크릿 : ADMIN_2FA_SECRET_KEY (미설정 시 COOKIE_SECRET 파생)
//   · 세금계산서 사업자번호 : PII_ENCRYPTION_KEY (미설정 시 COOKIE_SECRET 파생)
//
// 키를 바꾸면 **이미 저장된 암호문을 풀 수 없다.** 게다가 두 복호화 함수 모두
// 실패 시 예외를 던지지 않고 빈 문자열을 돌려준다 —
//   · 2FA: 모든 관리자의 코드 검증이 조용히 실패한다(= 전원 로그인 불가)
//   · PII: 사업자번호가 빈 값으로 보인다(= 데이터가 사라진 것처럼 보인다)
// 어느 쪽도 에러 로그를 남기지 않으므로, 교체 후에야 문제를 알게 된다.
//
// ⚠️ ADMIN_2FA_SECRET_KEY / PII_ENCRYPTION_KEY 를 따로 안 넣었다면 두 값 모두
//    COOKIE_SECRET 에서 파생된다. 즉 **COOKIE_SECRET 만 바꿔도 둘 다 깨진다.**
//
// ── 사용법 ─────────────────────────────────────────────────────────────────
// 1) 반드시 백업부터: bash scripts/db-backup.sh
//
// 2) 확인만(아무것도 안 바꿈):
//      ROTATE_DRY_RUN=true \
//      OLD_ADMIN_2FA_SECRET_KEY=<옛 키> OLD_PII_ENCRYPTION_KEY=<옛 키> \
//      npx medusa exec ./src/scripts/rotate-encryption-keys.ts
//
// 3) 실제 교체 — .env 의 ADMIN_2FA_SECRET_KEY/PII_ENCRYPTION_KEY 를 **새 값으로 먼저 바꾼 뒤**,
//    옛 값을 OLD_* 로 넘겨서 실행한다:
//      OLD_ADMIN_2FA_SECRET_KEY=<옛 키> OLD_PII_ENCRYPTION_KEY=<옛 키> \
//      npx medusa exec ./src/scripts/rotate-encryption-keys.ts
//
//    전용 키가 없어 COOKIE_SECRET 에서 파생 중이었다면 OLD_* 에 **옛 COOKIE_SECRET** 을 넣는다.
//
// 4) 끝나면 관리자 한 명으로 2FA 로그인, 세금계산서 한 건 조회로 눈으로 확인한다.
//
// ── 안전장치 ───────────────────────────────────────────────────────────────
//  · 옛 키로 복호화되지 않는 행이 하나라도 있으면 **아무것도 저장하지 않고 중단**한다.
//    (키를 잘못 넣었을 때 멀쩡한 데이터를 못 쓰게 덮어쓰는 것을 막는다)
//  · 이미 새 키로 잠긴 행은 건너뛴다 — 중간에 끊겨도 다시 돌리면 된다(멱등).
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { ADMIN_2FA_MODULE } from "../modules/admin-2fa"
import { TAX_INVOICE_MODULE } from "../modules/tax-invoice"

const DRY_RUN = process.env.ROTATE_DRY_RUN === "true"

/** 두 유틸과 동일한 키 파생(sha256 32바이트). */
const deriveKey = (raw: string) => crypto.createHash("sha256").update(raw).digest()

/** 두 유틸과 동일한 포맷: "<prefix>iv.tag.ct" (base64) */
function decryptWith(stored: string, prefix: string, keyRaw: string): string | null {
  if (!stored || !stored.startsWith(prefix)) return null // 접두어 없음 = 평문(레거시), 대상 아님
  try {
    const [ivB, tagB, ctB] = stored.slice(prefix.length).split(".")
    const d = crypto.createDecipheriv("aes-256-gcm", deriveKey(keyRaw), Buffer.from(ivB, "base64"))
    d.setAuthTag(Buffer.from(tagB, "base64"))
    return Buffer.concat([d.update(Buffer.from(ctB, "base64")), d.final()]).toString("utf8")
  } catch {
    return null // 이 키로는 못 푼다
  }
}

function encryptWith(plain: string, prefix: string, keyRaw: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv("aes-256-gcm", deriveKey(keyRaw), iv)
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return `${prefix}${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${ct.toString("base64")}`
}

type Plan = { id: string; next: string }

/**
 * 한 필드에 대한 재암호화 계획을 세운다.
 * 옛 키로도 새 키로도 못 푸는 행이 있으면 blocked 에 담아 호출부가 중단하게 한다.
 */
function planReencrypt(
  rows: any[],
  field: string,
  prefix: string,
  oldKey: string,
  newKey: string
): { plans: Plan[]; already: number; plaintext: number; blocked: string[] } {
  const plans: Plan[] = []
  const blocked: string[] = []
  let already = 0
  let plaintext = 0

  for (const row of rows) {
    const cur = row[field]
    if (typeof cur !== "string" || cur === "") continue
    if (!cur.startsWith(prefix)) {
      plaintext++ // 평문 레거시 — 로테이션 대상이 아니라 백필 대상이다
      continue
    }
    if (decryptWith(cur, prefix, newKey) !== null) {
      already++ // 이미 새 키 — 재실행이거나 중단 후 이어받기
      continue
    }
    const plain = decryptWith(cur, prefix, oldKey)
    if (plain === null) {
      blocked.push(row.id)
      continue
    }
    plans.push({ id: row.id, next: encryptWith(plain, prefix, newKey) })
  }
  return { plans, already, plaintext, blocked }
}

export default async function rotateEncryptionKeys({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cookie = process.env.COOKIE_SECRET || ""

  // 현재(새) 키 — 앱이 지금 쓰는 값과 같아야 한다
  const new2fa = process.env.ADMIN_2FA_SECRET_KEY || cookie
  const newPii = process.env.PII_ENCRYPTION_KEY || cookie
  // 옛 키 — 없으면 옛 COOKIE_SECRET 으로 폴백
  const oldCookie = process.env.OLD_COOKIE_SECRET || ""
  const old2fa = process.env.OLD_ADMIN_2FA_SECRET_KEY || oldCookie
  const oldPii = process.env.OLD_PII_ENCRYPTION_KEY || oldCookie

  if (!old2fa && !oldPii) {
    logger.error(
      "[rotate] 옛 키가 없습니다. OLD_ADMIN_2FA_SECRET_KEY / OLD_PII_ENCRYPTION_KEY " +
        "(또는 전용 키를 안 쓰고 있었다면 OLD_COOKIE_SECRET) 를 지정하세요."
    )
    return
  }

  logger.info(`[rotate] 시작${DRY_RUN ? " (DRY RUN — 저장하지 않음)" : ""}`)

  const blockedAll: string[] = []
  const work: Array<{ label: string; svc: any; updater: string; field: string; plans: Plan[] }> = []

  // ── 1. 관리자 2FA 시크릿 ────────────────────────────────────────────────
  if (old2fa && new2fa) {
    const svc = container.resolve(ADMIN_2FA_MODULE) as any
    const rows: any[] = await svc.listAdminTotps({})
    const r = planReencrypt(rows, "secret", "v1:", old2fa, new2fa)
    logger.info(
      `[rotate] 2FA 시크릿 ${rows.length}건 — 재암호화 대상 ${r.plans.length} · 이미 새 키 ${r.already} · 못 푼 행 ${r.blocked.length}`
    )
    blockedAll.push(...r.blocked.map((id) => `admin_totp:${id}`))
    work.push({ label: "2FA 시크릿", svc, updater: "updateAdminTotps", field: "secret", plans: r.plans })
  }

  // ── 2. 세금계산서 사업자번호 ────────────────────────────────────────────
  if (oldPii && newPii) {
    const svc = container.resolve(TAX_INVOICE_MODULE) as any
    const rows: any[] = await svc.listTaxInvoices({})
    const r = planReencrypt(rows, "biz_no", "pii1:", oldPii, newPii)
    logger.info(
      `[rotate] 사업자번호 ${rows.length}건 — 재암호화 대상 ${r.plans.length} · 이미 새 키 ${r.already} · 평문(백필 대상) ${r.plaintext} · 못 푼 행 ${r.blocked.length}`
    )
    blockedAll.push(...r.blocked.map((id) => `tax_invoice:${id}`))
    work.push({ label: "사업자번호", svc, updater: "updateTaxInvoices", field: "biz_no", plans: r.plans })
  }

  // ── 안전장치: 하나라도 못 풀면 전부 중단 ────────────────────────────────
  if (blockedAll.length) {
    logger.error(
      `[rotate] 중단 — 옛 키로도 새 키로도 복호화되지 않는 행이 ${blockedAll.length}건 있습니다.\n` +
        `         OLD_* 키가 맞는지 확인하세요. 아무것도 저장하지 않았습니다.\n` +
        `         대상: ${blockedAll.slice(0, 10).join(", ")}${blockedAll.length > 10 ? " …" : ""}`
    )
    return
  }

  const total = work.reduce((n, w) => n + w.plans.length, 0)
  if (total === 0) {
    logger.info("[rotate] 바꿀 것이 없습니다. (이미 새 키이거나 데이터 없음)")
    return
  }
  if (DRY_RUN) {
    logger.info(`[rotate] DRY RUN — ${total}건이 재암호화 대상입니다. 저장하지 않고 종료합니다.`)
    return
  }

  // ── 저장 ────────────────────────────────────────────────────────────────
  for (const w of work) {
    for (const p of w.plans) {
      await w.svc[w.updater]([{ id: p.id, [w.field]: p.next }])
    }
    if (w.plans.length) logger.info(`[rotate] ${w.label} ${w.plans.length}건 재암호화 완료`)
  }

  logger.info(
    `[rotate] 완료 — 총 ${total}건.\n` +
      `         확인: 관리자 1명으로 2FA 로그인, 세금계산서 1건 조회가 정상인지 눈으로 보세요.`
  )
}

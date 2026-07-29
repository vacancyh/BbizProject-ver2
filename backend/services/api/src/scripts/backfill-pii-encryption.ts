// PII at-rest 암호화 백필 — 암호화 도입(2026-07-27, H5) **이전에 저장된 평문**을 암호화한다.
//
// 배경: encryptPii/decryptPii 는 무중단 마이그레이션을 위해 "접두어 없으면 레거시 평문으로 간주"한다.
//       덕분에 서비스는 정상 동작하지만, **기존 행은 평문으로 남는다.**
//       판매 전 점검(2026-07-28)에서 실제로 평문 3건이 확인되어 이 스크립트를 만들었다.
//
// 실행: npx medusa exec ./src/scripts/backfill-pii-encryption.ts
//       (건드릴 것이 없으면 아무 것도 바꾸지 않음 — 멱등)
//
// 확인만 하고 싶으면: PII_BACKFILL_DRY_RUN=true npx medusa exec ./src/scripts/backfill-pii-encryption.ts
//
// ⚠️ 운영에서는 반드시 **백업 후** 실행할 것(scripts/db-backup.sh). 키가 바뀌면 복호화가 불가하므로
//    PII_ENCRYPTION_KEY 는 백필 시점과 동일한 값을 유지해야 한다.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TAX_INVOICE_MODULE } from "../modules/tax-invoice"
import { encryptPii } from "../modules/tax-invoice/crypto"

const PREFIX = "pii1:"
const DRY_RUN = process.env.PII_BACKFILL_DRY_RUN === "true"

export default async function backfillPiiEncryption({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const svc = container.resolve(TAX_INVOICE_MODULE) as any

  logger.info(`[pii-backfill] 시작${DRY_RUN ? " (DRY RUN — 저장하지 않음)" : ""}`)

  // 세금계산서 사업자번호(biz_no)
  const invoices: any[] = await svc.listTaxInvoices({})
  const targets = invoices.filter(
    (r) => typeof r.biz_no === "string" && r.biz_no !== "" && !r.biz_no.startsWith(PREFIX)
  )

  logger.info(`[pii-backfill] tax_invoice 총 ${invoices.length}건 · 평문 ${targets.length}건`)

  let done = 0
  for (const row of targets) {
    if (DRY_RUN) {
      logger.info(`[pii-backfill] (dry) ${row.id} biz_no 평문 → 암호화 대상`)
      continue
    }
    await svc.updateTaxInvoices([{ id: row.id, biz_no: encryptPii(row.biz_no) }])
    done++
  }

  // 검증: 남은 평문이 없는지 재확인
  const after: any[] = await svc.listTaxInvoices({})
  const remaining = after.filter(
    (r) => typeof r.biz_no === "string" && r.biz_no !== "" && !r.biz_no.startsWith(PREFIX)
  ).length

  logger.info(`[pii-backfill] 완료 — 암호화 ${done}건 · 남은 평문 ${remaining}건`)
  if (!DRY_RUN && remaining > 0) {
    logger.error(`[pii-backfill] 평문이 남아 있습니다(${remaining}건). 로그를 확인하세요.`)
  }
}

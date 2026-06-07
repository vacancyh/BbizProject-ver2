import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 세금계산서 ↔ 정산 기간 링크 컬럼 추가 — d7 정산관리 연동.
 *
 * tax_invoice 에 payout_id(text, nullable) 컬럼 + 인덱스 추가.
 * settlement_payout.id 를 text 느슨 연결(FK 제약 없음 — Medusa 모듈 분리 원칙).
 *
 * ★ 적용: macOS bind-mount 마이그 hang → main 게이트 psql 직접 적용.
 */
export class Migration20260604130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "tax_invoice" ADD COLUMN IF NOT EXISTS "payout_id" text NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_tax_invoice_payout_id" ON "tax_invoice" ("payout_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_tax_invoice_payout_id";`
    )
    this.addSql(
      `ALTER TABLE "tax_invoice" DROP COLUMN IF EXISTS "payout_id";`
    )
  }
}

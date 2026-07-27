import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 스키마 드리프트 보정(보안점검 2026-07-27) — tax_invoice.payout_id 누락 복구.
 *
 * 초기 마이그레이션이 payout_id 없이 tax_invoice 를 생성했고, 이후 마이그레이션이
 * `create table if not exists` 라 fresh DB 에서 no-op 되어 payout_id 컬럼이 누락됨
 * (→ 세금계산서 발급 시 "column payout_id does not exist" 500).
 * 명시적 ADD COLUMN IF NOT EXISTS 로 멱등 보정한다(기존/신규 DB 모두 안전).
 */
export class Migration20260727043000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "tax_invoice" add column if not exists "payout_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "tax_invoice" drop column if exists "payout_id";`);
  }
}

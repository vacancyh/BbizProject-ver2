import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 정산 지급 모듈 초기 스키마 — settlement_payout.
 * ★ 적용: macOS bind-mount 마이그 hang → main 게이트 psql 직접 적용.
 */
export class Migration20260604120500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "settlement_payout" ("id" text not null, "period_key" text not null, "gross_amount" numeric not null default 0, "refund_amount" numeric not null default 0, "pg_fee" numeric not null default 0, "net_amount" numeric not null default 0, "status" text not null default 'open', "closed_at" text null, "paid_at" text null, "memo" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "settlement_payout_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_settlement_payout_period_key_unique" ON "settlement_payout" ("period_key") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_settlement_payout_deleted_at" ON "settlement_payout" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "settlement_payout" cascade;`)
  }
}

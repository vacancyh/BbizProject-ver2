import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 포인트 모듈 초기 스키마 — point_ledger (append-only).
 *
 * ★ 적용 방식: macOS bind-mount 마이그 hang 이슈로 main 게이트에서 psql 직접 적용.
 */
export class Migration20260604120100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "point_ledger" ("id" text not null, "customer_id" text not null, "entry_type" text not null, "amount" numeric not null, "reason" text null, "expires_at" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "point_ledger_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_point_ledger_customer_id" ON "point_ledger" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_point_ledger_deleted_at" ON "point_ledger" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "point_ledger" cascade;`)
  }
}

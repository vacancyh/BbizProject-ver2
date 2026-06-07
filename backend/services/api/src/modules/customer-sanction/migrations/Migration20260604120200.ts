import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 제재 모듈 초기 스키마 — customer_sanction.
 * ★ 적용: macOS bind-mount 마이그 hang → main 게이트 psql 직접 적용.
 */
export class Migration20260604120200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_sanction" ("id" text not null, "customer_id" text not null, "level" text not null, "reason" text null, "started_at" text not null, "until_at" text null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_sanction_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_sanction_customer_id" ON "customer_sanction" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_sanction_deleted_at" ON "customer_sanction" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_sanction" cascade;`)
  }
}

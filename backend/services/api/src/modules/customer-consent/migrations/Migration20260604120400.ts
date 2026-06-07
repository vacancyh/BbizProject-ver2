import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 동의 이력 모듈 초기 스키마 — consent_log (append-only).
 * ★ 적용: macOS bind-mount 마이그 hang → main 게이트 psql 직접 적용.
 */
export class Migration20260604120400 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "consent_log" ("id" text not null, "customer_id" text not null, "channel" text not null, "agreed" boolean not null, "recorded_at" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "consent_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_consent_log_customer_id" ON "consent_log" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_consent_log_deleted_at" ON "consent_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "consent_log" cascade;`)
  }
}

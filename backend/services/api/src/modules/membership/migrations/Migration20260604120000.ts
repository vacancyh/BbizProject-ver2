import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 멤버십 모듈 초기 스키마 — customer_membership.
 *
 * ★ 적용 방식: macOS bind-mount 에서 medusa db:migrate hang 이슈로,
 *   main 게이트에서 psql 직접 적용한다(메모리 backend-migration-workaround 우회).
 *   본 파일은 스키마 정의 정본(향후 정상 마이그 환경 복귀 시 사용).
 */
export class Migration20260604120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_membership" ("id" text not null, "customer_id" text not null, "accrued_amount" numeric not null default 0, "current_tier" text not null default '일반', "last_change_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_membership_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_membership_customer_id_unique" ON "customer_membership" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_customer_membership_deleted_at" ON "customer_membership" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_membership" cascade;`)
  }
}

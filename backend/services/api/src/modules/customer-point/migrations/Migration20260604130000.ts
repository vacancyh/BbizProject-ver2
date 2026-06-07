import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * 포인트 자동적립 멱등 로그 테이블 — point_accrual_log.
 *
 * UNIQUE(order_id, reason) 복합 인덱스로 동일 주문 동일 사유 중복 적립을 DB 레벨에서 차단한다.
 *
 * ★ 적용 방식: macOS bind-mount 마이그 hang 이슈로 main 게이트에서 psql 직접 적용
 *            (backend-migration-workaround MEMORY 참조).
 */
export class Migration20260604130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "point_accrual_log" (` +
      `"id" text not null, ` +
      `"order_id" text not null, ` +
      `"customer_id" text not null, ` +
      `"reason" text not null, ` +
      `"points_earned" numeric not null default 0, ` +
      `"ledger_id" text null, ` +
      `"created_at" timestamptz not null default now(), ` +
      `"updated_at" timestamptz not null default now(), ` +
      `"deleted_at" timestamptz null, ` +
      `constraint "point_accrual_log_pkey" primary key ("id")` +
      `);`
    )
    // 중복 적립 방지 핵심 UNIQUE 인덱스 — order_id + reason 조합 고유
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_point_accrual_log_order_reason_unique" ` +
      `ON "point_accrual_log" ("order_id", "reason") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_point_accrual_log_customer_id" ` +
      `ON "point_accrual_log" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_point_accrual_log_deleted_at" ` +
      `ON "point_accrual_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "point_accrual_log" cascade;`)
  }
}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 환불 기록 + 멱등키 캐시 테이블 추가 — order_cancellation, refund_idempotency.
 *
 * spec: dag/d2_주문관리/t007_환불.md §7 DB
 * ★ 적용 금지 — main 게이트에서 psql 직접 적용.
 */
export class Migration20260603100000 extends Migration {

  override async up(): Promise<void> {
    // ─── order_cancellation (환불/취소 기록, append-only) ───────────────────
    this.addSql(`
      create table if not exists "order_cancellation" (
        "id"              text          not null,
        "order_id"        text          not null,
        "refund_amount"   integer       not null default 0,
        "refund_method"   text          not null,
        "account_info"    jsonb         null,
        "restored_points" integer       not null default 0,
        "restored_coupon" integer       not null default 0,
        "reason"          text          not null,
        "created_at"      timestamptz   not null default now(),
        "updated_at"      timestamptz   not null default now(),
        "deleted_at"      timestamptz   null,
        constraint "order_cancellation_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_cancellation_order_id" ON "order_cancellation" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_cancellation_deleted_at" ON "order_cancellation" ("deleted_at") WHERE deleted_at IS NULL;`);

    // ─── refund_idempotency (멱등키 캐시) ──────────────────────────────────
    this.addSql(`
      create table if not exists "refund_idempotency" (
        "id"              text          not null,
        "key"             text          not null,
        "cached_response" jsonb         not null,
        "expires_at"      timestamptz   not null,
        "created_at"      timestamptz   not null default now(),
        "updated_at"      timestamptz   not null default now(),
        "deleted_at"      timestamptz   null,
        constraint "refund_idempotency_pkey" primary key ("id"),
        constraint "refund_idempotency_key_unique" unique ("key")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refund_idempotency_key" ON "refund_idempotency" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refund_idempotency_deleted_at" ON "refund_idempotency" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "refund_idempotency" cascade;`);
    this.addSql(`drop table if exists "order_cancellation" cascade;`);
  }

}

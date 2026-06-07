import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 교환 그룹(order-exchange-group) 모듈 초기 스키마 — exchange_group.
 *
 * spec: t005_교환.md §7 D11(exchange_group).
 * 필드: id, order_id, total_price_diff, pickup_tracking_no, version, status, exchange_ids.
 */
export class Migration20260603100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "exchange_group" (
        "id" text not null,
        "order_id" text not null,
        "total_price_diff" numeric not null default 0,
        "pickup_tracking_no" text null,
        "version" integer not null default 1,
        "status" text check ("status" in ('PENDING','PROCESSING','COMPLETED','CANCELED')) not null default 'PENDING',
        "exchange_ids" jsonb not null default '[]',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "exchange_group_pkey" primary key ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_exchange_group_order_id" ON "exchange_group" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_exchange_group_deleted_at" ON "exchange_group" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "exchange_group" cascade;`);
  }

}

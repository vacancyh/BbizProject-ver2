import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 타임세일 모듈 초기 스키마 — time_sale.
 *  - discount_value/original_price = numeric(서비스 toView 에서 Number 정규화).
 *  - soft-delete 인덱스 포함(deleted_at WHERE 부분 인덱스).
 */
export class Migration20260604120600 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "time_sale" ("id" text not null, "product_id" text not null, "title" text not null, "discount_type" text not null, "discount_value" numeric not null, "original_price" numeric null, "starts_at" text not null, "ends_at" text not null, "status" text not null default 'scheduled', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "time_sale_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_time_sale_product_id" ON "time_sale" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_time_sale_status" ON "time_sale" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_time_sale_deleted_at" ON "time_sale" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "time_sale" cascade;`);
  }

}

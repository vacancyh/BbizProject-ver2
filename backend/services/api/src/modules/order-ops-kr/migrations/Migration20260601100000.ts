import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 주문 운영(한국형) 모듈 초기 스키마 — order_admin_note(관리자 메모).
 */
export class Migration20260601100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "order_admin_note" ("id" text not null, "order_id" text not null, "content" text not null, "kind" text not null default 'memo', "author_id" text null, "author_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "order_admin_note_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_admin_note_order_id" ON "order_admin_note" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_order_admin_note_deleted_at" ON "order_admin_note" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "order_admin_note" cascade;`);
  }

}

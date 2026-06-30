import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260630022435 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "faq" ("id" text not null, "category" text not null, "question" text not null, "answer" text not null, "sort_order" integer not null default 0, "status" text not null default 'published', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "faq_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_faq_deleted_at" ON "faq" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "notice" ("id" text not null, "title" text not null, "body" text not null, "pinned" boolean not null default false, "status" text not null default 'published', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notice_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notice_deleted_at" ON "notice" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "faq" cascade;`);

    this.addSql(`drop table if exists "notice" cascade;`);
  }

}

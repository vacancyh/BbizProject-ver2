import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260630041525 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "home_curation" ("id" text not null, "product_id" text not null, "sort_order" integer not null default 0, "status" text not null default 'published', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "home_curation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_home_curation_deleted_at" ON "home_curation" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "home_curation" cascade;`);
  }

}

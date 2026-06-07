import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531074814 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_type_option_template" ("id" text not null, "type_template_id" text not null, "option_title" text not null, "option_values" jsonb not null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_type_option_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_type_option_template_deleted_at" ON "product_type_option_template" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_type_template" ("id" text not null, "name" text not null, "disclosure_code" text null, "rank" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_type_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_type_template_deleted_at" ON "product_type_template" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_type_option_template" cascade;`);

    this.addSql(`drop table if exists "product_type_template" cascade;`);
  }

}

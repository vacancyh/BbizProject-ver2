import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531094426 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_type_disclosure_field" ("id" text not null, "type_template_id" text not null, "field_key" text not null, "label" text not null, "required" boolean not null default true, "input_type" text not null default 'text', "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_type_disclosure_field_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_type_disclosure_field_deleted_at" ON "product_type_disclosure_field" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_type_disclosure_field" cascade;`);
  }

}

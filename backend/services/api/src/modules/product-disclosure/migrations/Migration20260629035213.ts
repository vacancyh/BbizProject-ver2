import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260629035213 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_disclosure" ("id" text not null, "product_id" text not null, "type_template_id" text not null, "version" integer not null default 1, "fields_json" text not null, "status" text not null default 'draft', "published_by" text null, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_disclosure_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_disclosure_product_id" ON "product_disclosure" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_disclosure_type_template_id" ON "product_disclosure" ("type_template_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_disclosure_deleted_at" ON "product_disclosure" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_disclosure" cascade;`);
  }

}

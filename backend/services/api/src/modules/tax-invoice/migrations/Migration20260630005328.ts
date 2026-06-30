import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260630005328 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "tax_invoice" ("id" text not null, "customer_id" text not null, "order_id" text null, "payout_id" text null, "biz_no" text not null, "company_name" text null, "amount" integer not null default 0, "status" text not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "tax_invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_invoice_customer_id" ON "tax_invoice" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_tax_invoice_deleted_at" ON "tax_invoice" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "tax_invoice" cascade;`);
  }

}

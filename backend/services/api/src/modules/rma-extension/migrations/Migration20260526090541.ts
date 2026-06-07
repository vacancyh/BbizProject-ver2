import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260526090541 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "reimbursement_method" ("id" text not null, "order_return_id" text not null, "type" text check ("type" in ('REFUND', 'STORE_CREDIT', 'EXCHANGE', 'REPLACEMENT')) not null, "amount" numeric not null default 0, "status" text check ("status" in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED')) not null default 'PENDING', "raw_amount" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "reimbursement_method_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_reimbursement_method_deleted_at" ON "reimbursement_method" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "return_inspection" ("id" text not null, "order_return_id" text not null, "resellable" boolean not null default true, "condition" text check ("condition" in ('A_GRADE', 'B_GRADE', 'C_GRADE', 'DISPOSE')) not null default 'A_GRADE', "inspector_id" text null, "notes" text null, "inspected_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_inspection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_inspection_deleted_at" ON "return_inspection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "return_shipping_fee_policy" ("id" text not null, "returns_policy_id" text not null, "reason" text check ("reason" in ('CUSTOMER_CHANGE_OF_MIND', 'PRODUCT_DEFECT', 'WRONG_DELIVERY', 'OTHER')) not null, "payer" text check ("payer" in ('CUSTOMER', 'SELLER')) not null, "amount" numeric null, "raw_amount" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "return_shipping_fee_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_return_shipping_fee_policy_deleted_at" ON "return_shipping_fee_policy" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "returns_policy" ("id" text not null, "store_id" text not null, "name" text not null, "window_days" integer not null default 7, "restocking_fee_pct" integer not null default 0, "shipping_fee_payer" text check ("shipping_fee_payer" in ('customer', 'seller', 'split')) not null default 'customer', "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "returns_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_returns_policy_deleted_at" ON "returns_policy" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reimbursement_method" cascade;`);

    this.addSql(`drop table if exists "return_inspection" cascade;`);

    this.addSql(`drop table if exists "return_shipping_fee_policy" cascade;`);

    this.addSql(`drop table if exists "returns_policy" cascade;`);
  }

}

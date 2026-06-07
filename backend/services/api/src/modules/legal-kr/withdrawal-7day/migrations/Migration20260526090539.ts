import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260526090539 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "withdrawal_eligibility" drop constraint if exists "withdrawal_eligibility_order_id_unique";`);
    this.addSql(`create table if not exists "withdrawal_eligibility" ("id" text not null, "order_id" text not null, "delivered_at" timestamptz not null, "eligible_until" timestamptz not null, "is_eligible" boolean not null default true, "disqualified_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "withdrawal_eligibility_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_withdrawal_eligibility_order_id_unique" ON "withdrawal_eligibility" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_withdrawal_eligibility_deleted_at" ON "withdrawal_eligibility" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "withdrawal_reason_record" ("id" text not null, "order_id" text not null, "reason" text check ("reason" in ('simple_change', 'defect', 'wrong_item', 'other')) not null, "description" text null, "claimed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "withdrawal_reason_record_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_withdrawal_reason_record_order_id" ON "withdrawal_reason_record" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_withdrawal_reason_record_deleted_at" ON "withdrawal_reason_record" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "withdrawal_eligibility" cascade;`);

    this.addSql(`drop table if exists "withdrawal_reason_record" cascade;`);
  }

}

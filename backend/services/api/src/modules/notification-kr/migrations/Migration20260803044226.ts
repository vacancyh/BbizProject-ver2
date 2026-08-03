import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260803044226 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "notification_log" ("id" text not null, "event" text not null, "channel" text not null, "recipient" text not null, "title" text null, "body" text not null, "status" text not null, "error" text null, "order_id" text null, "customer_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notification_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_log_event" ON "notification_log" ("event") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_log_status" ON "notification_log" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_log_customer" ON "notification_log" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_log_deleted_at" ON "notification_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "notification_template" ("id" text not null, "event" text not null, "channel" text not null, "name" text not null, "title" text null, "body" text not null, "variables" text null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notification_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_template_event" ON "notification_template" ("event") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_template_deleted_at" ON "notification_template" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_log" cascade;`);

    this.addSql(`drop table if exists "notification_template" cascade;`);
  }

}

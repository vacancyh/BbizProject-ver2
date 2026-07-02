import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260701073651 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "admin_totp" drop constraint if exists "admin_totp_user_id_unique";`);
    this.addSql(`create table if not exists "admin_totp" ("id" text not null, "user_id" text not null, "secret" text not null, "enabled" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_totp_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_totp_user_id_unique" ON "admin_totp" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_totp_deleted_at" ON "admin_totp" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_totp" cascade;`);
  }

}

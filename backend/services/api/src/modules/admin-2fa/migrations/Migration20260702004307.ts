import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260702004307 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "admin_2fa_backup_code" ("id" text not null, "user_id" text not null, "code_hash" text not null, "used" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_2fa_backup_code_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_2fa_backup_code_user_id" ON "admin_2fa_backup_code" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_2fa_backup_code_hash" ON "admin_2fa_backup_code" ("code_hash") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_2fa_backup_code_deleted_at" ON "admin_2fa_backup_code" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_2fa_backup_code" cascade;`);
  }

}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260702000954 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "admin_totp_session" ("id" text not null, "user_id" text not null, "token_hash" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "admin_totp_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_totp_session_user_id" ON "admin_totp_session" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_totp_session_token_hash" ON "admin_totp_session" ("token_hash") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_admin_totp_session_deleted_at" ON "admin_totp_session" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_totp_session" cascade;`);
  }

}

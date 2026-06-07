import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 정책 저장소 모듈 초기 스키마 — system_policy / policy_history.
 */
export class Migration20260601090002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "system_policy" ("id" text not null, "key" text not null, "label" text not null, "category" text not null default 'general', "value" jsonb not null, "value_type" text not null default 'string', "description" text null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "system_policy_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_system_policy_key_unique" ON "system_policy" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_system_policy_deleted_at" ON "system_policy" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "policy_history" ("id" text not null, "policy_key" text not null, "before" jsonb null, "after" jsonb not null, "actor_id" text null, "actor_email" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "policy_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_policy_history_policy_key" ON "policy_history" ("policy_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_policy_history_deleted_at" ON "policy_history" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "system_policy" cascade;`);
    this.addSql(`drop table if exists "policy_history" cascade;`);
  }

}

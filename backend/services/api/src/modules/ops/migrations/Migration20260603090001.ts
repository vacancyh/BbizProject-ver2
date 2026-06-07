import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * ops 모듈 초기 스키마 — maintenance_state (점검모드 scope별 상태 보관).
 */
export class Migration20260603090001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "maintenance_state" ("id" text not null, "scope" text not null, "enabled" boolean not null default false, "message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "maintenance_state_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_maintenance_state_scope_unique" ON "maintenance_state" ("scope") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_maintenance_state_deleted_at" ON "maintenance_state" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "maintenance_state" cascade;`);
  }

}

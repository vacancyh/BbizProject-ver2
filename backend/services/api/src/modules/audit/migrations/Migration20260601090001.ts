import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 감사 로그 모듈 초기 스키마 — audit_log (append-only).
 */
export class Migration20260601090001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "audit_log" ("id" text not null, "actor_id" text null, "actor_email" text null, "action" text not null, "method" text not null, "path" text not null, "target_type" text null, "target_id" text null, "status_code" integer not null, "diff" jsonb null, "ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "audit_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_actor_id" ON "audit_log" ("actor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_audit_log_deleted_at" ON "audit_log" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "audit_log" cascade;`);
  }

}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * legal-doc 모듈 초기 스키마 — legal_doc (약관/방침 문서 버전별 관리).
 */
export class Migration20260603090002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "legal_doc" ("id" text not null, "type" text not null, "version" text not null, "body" text not null, "effective_at" timestamptz not null, "status" text not null default 'draft', "requires_consent" boolean not null default false, "published_by" text null, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "legal_doc_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_legal_doc_type_status" ON "legal_doc" ("type", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_legal_doc_deleted_at" ON "legal_doc" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "legal_doc" cascade;`);
  }

}

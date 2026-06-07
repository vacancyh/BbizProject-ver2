import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * RBAC 모듈 초기 스키마 — rbac_role / rbac_role_permission / rbac_user_role.
 * (기존 withdrawal-7day 마이그레이션과 동일 작성 규약)
 */
export class Migration20260601090000 extends Migration {

  override async up(): Promise<void> {
    // 등급
    this.addSql(`create table if not exists "rbac_role" ("id" text not null, "key" text not null, "name" text not null, "description" text null, "is_system" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rbac_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_rbac_role_key_unique" ON "rbac_role" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rbac_role_deleted_at" ON "rbac_role" ("deleted_at") WHERE deleted_at IS NULL;`);

    // 등급별 메뉴 권한
    this.addSql(`create table if not exists "rbac_role_permission" ("id" text not null, "role_key" text not null, "menu_id" text not null, "can_read" boolean not null default true, "can_create" boolean not null default false, "can_update" boolean not null default false, "can_delete" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rbac_role_permission_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rbac_role_permission_role_key" ON "rbac_role_permission" ("role_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rbac_role_permission_deleted_at" ON "rbac_role_permission" ("deleted_at") WHERE deleted_at IS NULL;`);

    // 관리자-등급 매핑
    this.addSql(`create table if not exists "rbac_user_role" ("id" text not null, "user_id" text not null, "role_key" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rbac_user_role_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_rbac_user_role_user_id_unique" ON "rbac_user_role" ("user_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rbac_user_role_deleted_at" ON "rbac_user_role" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rbac_role" cascade;`);
    this.addSql(`drop table if exists "rbac_role_permission" cascade;`);
    this.addSql(`drop table if exists "rbac_user_role" cascade;`);
  }

}

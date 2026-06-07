import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260526090402 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "state_machine_config" drop constraint if exists "state_machine_config_domain_unique";`);
    this.addSql(`create table if not exists "state_history" ("id" text not null, "entity_id" text not null, "domain" text not null, "from_state" text not null, "to_state" text not null, "actor" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "state_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_state_history_entity_id" ON "state_history" ("entity_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_state_history_domain" ON "state_history" ("domain") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_state_history_deleted_at" ON "state_history" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "state_machine_config" ("id" text not null, "domain" text not null, "states" jsonb not null, "transitions" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "state_machine_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_state_machine_config_domain_unique" ON "state_machine_config" ("domain") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_state_machine_config_deleted_at" ON "state_machine_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "state_history" cascade;`);

    this.addSql(`drop table if exists "state_machine_config" cascade;`);
  }

}

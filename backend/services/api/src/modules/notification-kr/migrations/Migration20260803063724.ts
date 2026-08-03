import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260803063724 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "notification_template" add column if not exists "template_code" text null, add column if not exists "buttons" text null, add column if not exists "fallback_body" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "notification_template" drop column if exists "template_code", drop column if exists "buttons", drop column if exists "fallback_body";`);
  }

}

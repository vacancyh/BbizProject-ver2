import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531100123 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_type_template" add column if not exists "parent_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_type_template" drop column if exists "parent_id";`);
  }

}

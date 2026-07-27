import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260727042146 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "banned_word" ("id" text not null, "word" text not null, "scope" text not null default 'all', "created_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banned_word_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banned_word_word" ON "banned_word" ("word") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banned_word_deleted_at" ON "banned_word" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "popular_search_term" ("id" text not null, "term" text not null, "count" integer not null default 0, "last_searched_at" timestamptz null, "is_banned" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "popular_search_term_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_popular_search_term_term" ON "popular_search_term" ("term") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_popular_search_term_deleted_at" ON "popular_search_term" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_view_count" ("id" text not null, "product_id" text not null, "count" integer not null default 0, "last_viewed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_view_count_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_view_count_product_id" ON "product_view_count" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_view_count_deleted_at" ON "product_view_count" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "product_wishlist" ("id" text not null, "customer_id" text not null, "product_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_wishlist_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_customer_id" ON "product_wishlist" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_product_id" ON "product_wishlist" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_deleted_at" ON "product_wishlist" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banned_word" cascade;`);

    this.addSql(`drop table if exists "popular_search_term" cascade;`);

    this.addSql(`drop table if exists "product_view_count" cascade;`);

    this.addSql(`drop table if exists "product_wishlist" cascade;`);
  }

}

import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * 상품 큐레이션 모듈 초기 스키마.
 *  - product_view_count  : 상품별 조회수
 *  - product_wishlist    : 고객별 위시리스트
 *  - popular_search_term : 인기 검색어 집계 + 금칙어 플래그
 *  - banned_word         : 금칙어 원부
 */
export class Migration20260604130000 extends Migration {

  override async up(): Promise<void> {
    // ── 조회수 ──────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_view_count" (
        "id"             TEXT        NOT NULL,
        "product_id"     TEXT        NOT NULL,
        "count"          INTEGER     NOT NULL DEFAULT 0,
        "last_viewed_at" TIMESTAMPTZ NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ NULL,
        CONSTRAINT "product_view_count_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_view_count_product_id" ON "product_view_count" ("product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_view_count_product_id" ON "product_view_count" ("product_id") WHERE deleted_at IS NULL;`)

    // ── 위시리스트 ────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_wishlist" (
        "id"          TEXT        NOT NULL,
        "customer_id" TEXT        NOT NULL,
        "product_id"  TEXT        NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ NULL,
        CONSTRAINT "product_wishlist_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_customer_id" ON "product_wishlist" ("customer_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_product_id" ON "product_wishlist" ("product_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_wishlist_customer_product" ON "product_wishlist" ("customer_id", "product_id") WHERE deleted_at IS NULL;`)

    // ── 인기 검색어 ───────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "popular_search_term" (
        "id"               TEXT        NOT NULL,
        "term"             TEXT        NOT NULL,
        "count"            INTEGER     NOT NULL DEFAULT 0,
        "last_searched_at" TIMESTAMPTZ NULL,
        "is_banned"        BOOLEAN     NOT NULL DEFAULT false,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMPTZ NULL,
        CONSTRAINT "popular_search_term_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_popular_search_term_term" ON "popular_search_term" ("term") WHERE deleted_at IS NULL;`)

    // ── 금칙어 ─────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "banned_word" (
        "id"         TEXT        NOT NULL,
        "word"       TEXT        NOT NULL,
        "scope"      TEXT        NOT NULL DEFAULT 'all',
        "created_by" TEXT        NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "banned_word_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_banned_word_word" ON "banned_word" ("word") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "product_view_count" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "product_wishlist" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "popular_search_term" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "banned_word" CASCADE;`)
  }

}

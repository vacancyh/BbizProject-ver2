-- d3 상품 큐레이션·상품정보고시 초기 스키마
-- 적용: psql 직접 (medusa db:migrate 금지 — backend-migration-workaround 참조)
-- 작성: 2026-06-04

-- ── 상품 큐레이션(product-curation) ───────────────────────────────────────

-- 조회수
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
CREATE INDEX IF NOT EXISTS "IDX_product_view_count_product_id"
  ON "product_view_count" ("product_id") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_view_count_product_id"
  ON "product_view_count" ("product_id") WHERE deleted_at IS NULL;

-- 위시리스트
CREATE TABLE IF NOT EXISTS "product_wishlist" (
  "id"          TEXT        NOT NULL,
  "customer_id" TEXT        NOT NULL,
  "product_id"  TEXT        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"  TIMESTAMPTZ NULL,
  CONSTRAINT "product_wishlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_customer_id"
  ON "product_wishlist" ("customer_id") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_product_wishlist_product_id"
  ON "product_wishlist" ("product_id") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_wishlist_customer_product"
  ON "product_wishlist" ("customer_id", "product_id") WHERE deleted_at IS NULL;

-- 인기 검색어
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
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_popular_search_term_term"
  ON "popular_search_term" ("term") WHERE deleted_at IS NULL;

-- 금칙어
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
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_banned_word_word"
  ON "banned_word" ("word") WHERE deleted_at IS NULL;

-- ── 상품정보고시(product-disclosure) ──────────────────────────────────────

-- 고시 버전 이력
CREATE TABLE IF NOT EXISTS "product_disclosure" (
  "id"               TEXT        NOT NULL,
  "product_id"       TEXT        NOT NULL,
  "type_template_id" TEXT        NOT NULL,
  "version"          INTEGER     NOT NULL DEFAULT 1,
  "fields_json"      TEXT        NOT NULL,
  "status"           TEXT        NOT NULL DEFAULT 'draft',
  "published_by"     TEXT        NULL,
  "published_at"     TIMESTAMPTZ NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"       TIMESTAMPTZ NULL,
  CONSTRAINT "product_disclosure_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_product_disclosure_product_id"
  ON "product_disclosure" ("product_id") WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS "IDX_product_disclosure_type_template_id"
  ON "product_disclosure" ("type_template_id") WHERE deleted_at IS NULL;
-- 상품 당 published 1건 보장 (서비스 레이어 보장이지만 DB 레벨도 방어)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_disclosure_product_published"
  ON "product_disclosure" ("product_id") WHERE status = 'published' AND deleted_at IS NULL;

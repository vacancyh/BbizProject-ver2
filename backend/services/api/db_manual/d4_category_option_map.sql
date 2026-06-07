-- =============================================================
-- d4 카테고리 ↔ 옵션템플릿 N:M 매핑 테이블 수동 마이그레이션
-- =============================================================
-- 대상 DB: shop_medusa (api 서비스 DB)
-- 실행 방법:
--   psql $DATABASE_URL -f db_manual/d4_category_option_map.sql
--
-- 설계 메모:
--   category_id   → Medusa product_category.id (모듈 경계상 FK 없음)
--   option_tmpl_id → product_type_option_template.id (모듈 경계상 FK 없음)
--   UNIQUE(category_id, option_tmpl_id) → 동일 매핑 중복 차단
-- =============================================================

CREATE TABLE IF NOT EXISTS "category_option_map" (
  "id"             text        NOT NULL,
  "category_id"    text        NOT NULL,
  "option_tmpl_id" text        NOT NULL,
  "sort_order"     integer     NOT NULL DEFAULT 0,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  "deleted_at"     timestamptz          NULL,
  CONSTRAINT "category_option_map_pkey" PRIMARY KEY ("id")
);

-- 소프트 삭제 인덱스
CREATE INDEX IF NOT EXISTS "IDX_category_option_map_deleted_at"
  ON "category_option_map" ("deleted_at")
  WHERE deleted_at IS NULL;

-- 카테고리별 빠른 조회
CREATE INDEX IF NOT EXISTS "IDX_category_option_map_category_id"
  ON "category_option_map" ("category_id")
  WHERE deleted_at IS NULL;

-- 옵션템플릿별 빠른 조회
CREATE INDEX IF NOT EXISTS "IDX_category_option_map_option_tmpl_id"
  ON "category_option_map" ("option_tmpl_id")
  WHERE deleted_at IS NULL;

-- 중복 매핑 차단 (소프트 삭제 제외)
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_category_option_map_cat_opt"
  ON "category_option_map" ("category_id", "option_tmpl_id")
  WHERE deleted_at IS NULL;

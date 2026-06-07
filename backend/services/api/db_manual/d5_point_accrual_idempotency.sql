-- ============================================================
-- d5 포인트 자동적립 멱등 로그 테이블
-- 목적: 동일 주문(order_id) + 동일 사유(reason) 에 대한 중복 포인트 적립 차단.
-- 적용: macOS bind-mount 마이그 hang 이슈로 psql 직접 적용(backend-migration-workaround).
-- ============================================================

CREATE TABLE IF NOT EXISTS "point_accrual_log" (
  "id"            TEXT        NOT NULL,
  "order_id"      TEXT        NOT NULL,
  "customer_id"   TEXT        NOT NULL,
  "reason"        TEXT        NOT NULL,
  "points_earned" NUMERIC     NOT NULL DEFAULT 0,
  "ledger_id"     TEXT        NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"    TIMESTAMPTZ NULL,
  CONSTRAINT "point_accrual_log_pkey" PRIMARY KEY ("id")
);

-- 중복 적립 방지 핵심 UNIQUE 인덱스 (삭제되지 않은 행 기준)
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_point_accrual_log_order_reason_unique"
  ON "point_accrual_log" ("order_id", "reason")
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "IDX_point_accrual_log_customer_id"
  ON "point_accrual_log" ("customer_id")
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "IDX_point_accrual_log_deleted_at"
  ON "point_accrual_log" ("deleted_at")
  WHERE deleted_at IS NULL;

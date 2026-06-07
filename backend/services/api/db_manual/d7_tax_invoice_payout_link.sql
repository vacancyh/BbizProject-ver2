-- d7 정산관리: 세금계산서 ↔ 정산 기간 링크 컬럼 추가
-- Migration20260604130000 의 psql 직접 적용용 SQL.
-- 적용: psql -U postgres -d <DB명> -f d7_tax_invoice_payout_link.sql

ALTER TABLE "tax_invoice" ADD COLUMN IF NOT EXISTS "payout_id" text NULL;

CREATE INDEX IF NOT EXISTS "IDX_tax_invoice_payout_id"
  ON "tax_invoice" ("payout_id")
  WHERE deleted_at IS NULL;

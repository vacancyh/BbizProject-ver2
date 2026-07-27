#!/usr/bin/env bash
# 통합테스트용 임시 DB(shop_test) 준비 — 생성 → 마이그레이션 → 시드 → 누락테이블 보강 → 키 출력.
# 사용: backend/services/api 기준 경로에서 실행하거나 API_DIR 지정.
#   bash setup-test-db.sh
# 이후 별도 터미널에서:
#   cd backend/services/api && DATABASE_URL="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test" PORT=9009 npx medusa develop
set -e
API_DIR="${API_DIR:-$(cd "$(dirname "$0")/../../../../../backend/services/api" && pwd)}"
DB_URL="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test"
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "[1/4] shop_test 재생성"
docker exec shop-postgres psql -U shop -d shop -c "DROP DATABASE IF EXISTS shop_test;" >/dev/null
docker exec shop-postgres psql -U shop -d shop -c "CREATE DATABASE shop_test;" >/dev/null

echo "[2/4] 마이그레이션"
( cd "$API_DIR" && DATABASE_URL="$DB_URL" npx medusa db:migrate >/dev/null )

echo "[3/3] seed-all"
( cd "$API_DIR" && DATABASE_URL="$DB_URL" npx medusa exec ./src/scripts/seed-all.ts >/dev/null )

# NOTE(2026-07-27): product_wishlist·product_view_count·customer_activity·tax_invoice.payout_id 는
# 이제 정식 마이그레이션(db:generate + 수동 ALTER)으로 생성되므로 수동 테이블 보강 단계는 제거됨.

PUBKEY=$(docker exec shop-postgres psql -U shop -d shop_test -t -A -c "select token from api_key where type='publishable' limit 1;")
echo ""
echo "준비 완료. 백엔드 기동 후 아래로 실행:"
echo "  (백엔드) cd $API_DIR && DATABASE_URL=\"$DB_URL\" PORT=9009 npx medusa develop"
echo "  (테스트) BASE=http://localhost:9009 PUBKEY=$PUBKEY node run-all.mjs"
echo ""
echo "export PUBKEY=$PUBKEY"

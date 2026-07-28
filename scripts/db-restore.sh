#!/usr/bin/env bash
# DB 복구 — 백업 덤프를 지정한 DB 로 복원(기본은 새 DB 로 복원해 원본 보호)
#
# 사용:
#   bash scripts/db-restore.sh backups/shop-20260728-120000.dump shop_restore_test
#   FORCE_DROP=1 bash scripts/db-restore.sh <덤프> shop      # 기존 DB 를 지우고 덮어쓰기(위험)
#
# 안전장치: 대상 DB 가 이미 존재하면 FORCE_DROP=1 없이는 중단한다.
set -euo pipefail

DUMP="${1:-}"
TARGET_DB="${2:-}"
CONTAINER="${DB_CONTAINER:-shop-postgres}"
DB_USER="${DB_USER:-shop}"
ADMIN_DB="${ADMIN_DB:-postgres}"
FORCE_DROP="${FORCE_DROP:-0}"

if [ -z "$DUMP" ] || [ -z "$TARGET_DB" ]; then
  echo "사용법: bash scripts/db-restore.sh <덤프파일> <대상DB명>" >&2
  exit 1
fi
if [ ! -f "$DUMP" ]; then
  echo "덤프 파일을 찾을 수 없습니다: $DUMP" >&2
  exit 1
fi

psql_admin() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$ADMIN_DB" -t -A "$@"; }

EXISTS="$(psql_admin -c "select 1 from pg_database where datname='${TARGET_DB}';" | tr -d '[:space:]')"
if [ "$EXISTS" = "1" ]; then
  if [ "$FORCE_DROP" != "1" ]; then
    echo "대상 DB '${TARGET_DB}' 가 이미 존재합니다. 덮어쓰려면 FORCE_DROP=1 로 재실행하세요." >&2
    exit 2
  fi
  echo "[!] 기존 DB '${TARGET_DB}' 삭제(FORCE_DROP=1)"
  psql_admin -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='${TARGET_DB}' and pid <> pg_backend_pid();" > /dev/null
  psql_admin -c "DROP DATABASE ${TARGET_DB};" > /dev/null
fi

echo "[1/3] 대상 DB 생성: ${TARGET_DB}"
psql_admin -c "CREATE DATABASE ${TARGET_DB};" > /dev/null

echo "[2/3] 복원 중..."
# --no-owner: 로컬/운영 롤 차이로 인한 소유자 오류 회피
docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$TARGET_DB" --no-owner --clean --if-exists < "$DUMP" \
  || echo "    (일부 객체 경고 발생 — 아래 검증 결과로 판단)"

echo "[3/3] 복원 검증"
TABLES="$(docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$TARGET_DB" -t -A -c "select count(*) from information_schema.tables where table_schema='public';" | tr -d '[:space:]')"
ORDERS="$(docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$TARGET_DB" -t -A -c "select count(*) from \"order\";" 2>/dev/null | tr -d '[:space:]' || echo "-")"
PRODUCTS="$(docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$TARGET_DB" -t -A -c "select count(*) from product;" 2>/dev/null | tr -d '[:space:]' || echo "-")"

echo "    public 테이블 수: ${TABLES}"
echo "    주문/상품 행 수 : ${ORDERS} / ${PRODUCTS}"

if [ "${TABLES:-0}" -lt 10 ]; then
  echo "복원 실패 의심: 테이블 수가 비정상적으로 적습니다." >&2
  exit 3
fi
echo "복원 완료: ${TARGET_DB}"

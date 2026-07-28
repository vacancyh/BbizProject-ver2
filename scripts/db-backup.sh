#!/usr/bin/env bash
# DB 백업 — pg_dump(커스텀 포맷) 스냅샷 생성 + 보존기간 정리
#
# 사용:
#   bash scripts/db-backup.sh                 # dev DB(shop) 백업
#   DB_NAME=shop_test bash scripts/db-backup.sh
#   BACKUP_DIR=/mnt/backup RETENTION_DAYS=30 bash scripts/db-backup.sh
#
# 전제: docker 컨테이너 shop-postgres 기동(로컬 개발 기준).
#   운영에서는 CONTAINER 대신 PGHOST/PGUSER/PGPASSWORD 로 직접 접속하도록 USE_DOCKER=0 사용.
set -euo pipefail

CONTAINER="${DB_CONTAINER:-shop-postgres}"
DB_NAME="${DB_NAME:-shop}"
DB_USER="${DB_USER:-shop}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
USE_DOCKER="${USE_DOCKER:-1}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/${DB_NAME}-${STAMP}.dump"

echo "[1/3] 백업 생성 → ${OUT}"
if [ "$USE_DOCKER" = "1" ]; then
  # -Fc: 커스텀 포맷(압축·선택복원 가능), -Z6: 압축레벨
  docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z6 > "$OUT"
else
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z6 > "$OUT"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[2/3] 완료: ${OUT} (${SIZE})"

# 무결성 즉시 확인 — 목록을 읽을 수 없는 덤프는 복구도 불가
if [ "$USE_DOCKER" = "1" ]; then
  docker exec -i "$CONTAINER" pg_restore -l > /dev/null < "$OUT"
else
  pg_restore -l "$OUT" > /dev/null
fi
echo "        무결성 확인(pg_restore -l) OK"

echo "[3/3] ${RETENTION_DAYS}일 초과 백업 정리"
find "$BACKUP_DIR" -name "${DB_NAME}-*.dump" -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

echo ""
echo "복구: bash scripts/db-restore.sh ${OUT} <대상DB명>"

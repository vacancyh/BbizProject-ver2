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

echo "[1/4] 백업 생성 → ${OUT}"
if [ "$USE_DOCKER" = "1" ]; then
  # -Fc: 커스텀 포맷(압축·선택복원 가능), -Z6: 압축레벨
  docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z6 > "$OUT"
else
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z6 > "$OUT"
fi

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[2/4] 완료: ${OUT} (${SIZE})"

# 무결성 즉시 확인 — 목록을 읽을 수 없는 덤프는 복구도 불가
if [ "$USE_DOCKER" = "1" ]; then
  docker exec -i "$CONTAINER" pg_restore -l > /dev/null < "$OUT"
else
  pg_restore -l "$OUT" > /dev/null
fi
echo "        무결성 확인(pg_restore -l) OK"

# ─────────────────────────────────────────────────────────────────────────────
# 외부 저장소 업로드 (2026-08-03 추가)
#
# 왜 필요한가: 지금까지 백업은 **같은 서버 안에만** 있었다.
# 서버가 통째로 죽으면(디스크 장애·인스턴스 삭제·랜섬웨어) 백업도 함께 사라진다.
# 백업의 존재 이유가 사라지는 상황이다.
#
# 설정이 없으면 조용히 건너뛴다 — 로컬 백업만으로도 스크립트는 정상 동작한다.
#
#   BACKUP_S3_BUCKET   업로드 대상 버킷 (예: s3://my-shop-backups/db)
#   AWS_PROFILE        (선택) 사용할 AWS 프로필
#
# 전제: aws CLI 설치 + 자격증명 구성.
# 권장: 버킷에 **버전 관리 + 객체 잠금(Object Lock)** 을 켤 것.
#       랜섬웨어가 서버를 잡아도 과거 백업은 지울 수 없게 된다.
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "[3/4] 외부 저장소 업로드 → ${BACKUP_S3_BUCKET}"
  if ! command -v aws > /dev/null 2>&1; then
    echo "        ⚠️  aws CLI 가 없어 업로드를 건너뜁니다(로컬 백업은 정상)."
  elif aws s3 cp "$OUT" "${BACKUP_S3_BUCKET%/}/$(basename "$OUT")" ${AWS_PROFILE:+--profile "$AWS_PROFILE"}; then
    echo "        업로드 완료"
  else
    # 업로드 실패로 스크립트를 죽이지 않는다 — 로컬 백업은 이미 성공했다.
    # 다만 눈에 띄게 남긴다. 조용한 실패가 가장 위험하다.
    echo "        ❌ 업로드 실패 — 로컬 백업만 존재합니다. 자격증명/네트워크를 확인하세요."
  fi
else
  echo "[3/4] 외부 저장소 업로드 건너뜀 (BACKUP_S3_BUCKET 미설정)"
  echo "        ⚠️  백업이 이 서버에만 있습니다. 서버가 죽으면 백업도 함께 사라집니다."
fi

echo "[4/4] ${RETENTION_DAYS}일 초과 백업 정리"
find "$BACKUP_DIR" -name "${DB_NAME}-*.dump" -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

echo ""
echo "복구: bash scripts/db-restore.sh ${OUT} <대상DB명>"

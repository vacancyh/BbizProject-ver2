#!/bin/sh
# 관리자 한글 용어를 한국 쇼핑몰체로 일괄 치환 (직역체 개선).
# - 매핑표(ko-terms.map) 1곳만 고치면 전 관리자 화면에 반영 = 단일 소스.
# - 대상 2종:
#     ① 정본 ko.json (차후 medusa build 에도 유지)
#     ② 서빙 빌드 번들 public/admin/assets/*.js (재빌드 없이 즉시 반영)
# - 원본 1회 백업(.ko-terms-orig) 후 매번 거기서 재생성 = 멱등(재실행/재설치 안전).
# - brand-i18n.sh(Medusa→APP_NAME) 적용 이후 단계로 동작(그 결과 위에 덧입힘).
set -e

MAP="$(dirname "$0")/ko-terms.map"
[ -f "$MAP" ] || { echo "[ko-terms] 매핑표 없음: $MAP"; exit 0; }

# 매핑표 → sed 스크립트 파일 생성 (탭 구분, 주석/빈 줄 제외).
# 다중어 키("고객 가용성")의 공백 때문에 -e 인자 분할 대신 -f 스크립트 파일 사용.
SEDFILE=$(mktemp)
trap 'rm -f "$SEDFILE"' EXIT
awk -F'\t' '!/^#/ && NF>=2 && $1!="" { print "s/" $1 "/" $2 "/g" }' "$MAP" > "$SEDFILE"

# 브랜드 동적 치환(변수 단일 소스): Medusa/메두사 → APP_NAME_KO.
#   ⚠️ 소문자 medusa(@medusajs 등 코드)는 건드리지 않도록 대문자/한글만.
#   served 번들 텍스트 치환은 본 스크립트로 일원화(brand-i18n 와 충돌 방지).
APP_KO="${APP_NAME_KO:-쇼핑몰}"
printf 's/Medusa/%s/g\n' "$APP_KO" >> "$SEDFILE"
printf 's/메두사/%s/g\n' "$APP_KO" >> "$SEDFILE"

[ -s "$SEDFILE" ] || { echo "[ko-terms] 유효 매핑 0건"; exit 0; }

# 한 파일을 원본 백업본으로부터 재생성(멱등)
apply_file() {
  F="$1"; ORIGDIR="$2"
  [ -f "$F" ] || return 0
  b=$(basename "$F")
  mkdir -p "$ORIGDIR"
  [ -f "$ORIGDIR/$b" ] || cp "$F" "$ORIGDIR/$b"
  sed -f "$SEDFILE" "$ORIGDIR/$b" > "$F"
}

# ① 정본 ko.json (dashboard 패키지)
for DASH in $(ls -d /app/node_modules/.pnpm/@medusajs+dashboard@*/node_modules/@medusajs/dashboard 2>/dev/null); do
  KO="$DASH/src/i18n/translations/ko.json"
  if [ -f "$KO" ]; then
    apply_file "$KO" "$DASH/src/i18n/.ko-terms-orig"
    echo "[ko-terms] 정본 적용: $KO"
  fi
done

# ② 서빙 빌드 번들 (현재 화면) — 매핑 출발 단어를 포함하는 js 만 대상
ADMIN=/app/.medusa/server/public/admin/assets
if [ -d "$ADMIN" ]; then
  # 매핑표 첫 컬럼(직역 단어)으로 grep -E 패턴 구성 (busybox grep = --include 미지원 → find 사용)
  PAT=$(awk -F'\t' '!/^#/ && NF>=2 && $1!="" {printf "%s%s", sep, $1; sep="|"}' "$MAP")
  if [ -n "$PAT" ]; then
    N=0
    for F in $(find "$ADMIN" -name '*.js' -exec grep -lE "$PAT" {} + 2>/dev/null); do
      apply_file "$F" "/app/.medusa/server/public/admin/.ko-terms-orig"
      N=$((N+1))
    done
    echo "[ko-terms] 서빙 번들 적용 완료: $N개 파일 ($ADMIN)"
  fi
fi

echo "[ko-terms] 완료"

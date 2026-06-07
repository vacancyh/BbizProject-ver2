#!/bin/sh
# 브랜드 텍스트(Medusa / 메두사)를 APP_NAME_KO 로 치환 (admin 표시 텍스트 전처리).
# medusa build 는 dashboard 의 pre-built dist 를 입력으로 사용하므로 dist 를 치환해야 산출물에 반영됩니다.
# - 표시 텍스트만: 대문자 'Medusa' + 한글 '메두사' 만 치환.
#   ⚠️ 소문자 'medusa' 는 코드 식별자(@medusajs / medusajs.com / -medusa-locale 등)라 절대 치환 금지.
# - 원본은 .dist-orig / .i18n-orig 에 1회 백업 후 매번 거기서 재생성 = 멱등(재설치/재실행 안전).
# - APP_NAME_KO(기본 쇼핑몰) = docker-compose 환경변수 한 곳으로 전체 변경.
# - busybox grep 은 --include 미지원 → find + grep 사용.
# 이 스크립트 실행 후 `medusa build` 로 산출물에 반영해야 합니다.
set -e

APP_KO="${APP_NAME_KO:-쇼핑몰}"

# 표시용 브랜드 2형태만 치환 (소문자 medusa = 코드, 제외)
brand_sed() {
  sed -e "s/Medusa/$APP_KO/g" -e "s/메두사/$APP_KO/g" "$1"
}

for DASH in $(ls -d /app/node_modules/.pnpm/@medusajs+dashboard@*/node_modules/@medusajs/dashboard 2>/dev/null); do
  # --- src i18n (src 빌드 경로 대비) ---
  TDIR="$DASH/src/i18n/translations"
  if [ -d "$TDIR" ]; then
    ORIGDIR="$DASH/src/i18n/.i18n-orig"
    mkdir -p "$ORIGDIR"
    rm -f "$TDIR"/*.json.orig
    for F in "$TDIR"/*.json; do
      [ -f "$F" ] || continue
      b=$(basename "$F")
      [ -f "$ORIGDIR/$b" ] || cp "$F" "$ORIGDIR/$b"
      brand_sed "$ORIGDIR/$b" > "$F"
    done
  fi

  # --- dist (실제 build 입력) ---
  DIST="$DASH/dist"
  if [ -d "$DIST" ]; then
    DORIG="$DASH/.dist-orig"
    mkdir -p "$DORIG"
    for F in $(find "$DIST" \( -name '*.mjs' -o -name '*.js' -o -name '*.json' \) -exec grep -lE 'Medusa|메두사' {} + 2>/dev/null); do
      b=$(basename "$F")
      [ -f "$DORIG/$b" ] || cp "$F" "$DORIG/$b"
      brand_sed "$DORIG/$b" > "$F"
    done
    echo "[brand-i18n] $DASH/dist : Medusa/메두사 -> $APP_KO 치환"
  fi
done
echo "[brand-i18n] 완료 — 이후 medusa build 필요"

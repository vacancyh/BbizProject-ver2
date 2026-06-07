#!/bin/sh
# shop backend 기동 (standalone, /app = Medusa 앱 루트)
set -e

if [ "$NODE_ENV" = "production" ]; then
  SERVER=/app/.medusa/server
  INDEX="$SERVER/public/admin/index.html"

  if [ ! -d "$SERVER" ]; then
    echo "[prod-start] .medusa/server 없음 → medusa build 실행"
    (cd /app && npx medusa build)
  fi

  if [ -f "$INDEX" ] && ! grep -q 'lng-default-ko' "$INDEX"; then
    sed -i 's#</head>#<script data-lng-default-ko>localStorage.setItem("lng","ko");document.cookie="lng=ko;path=/;max-age=31536000";</script></head>#' "$INDEX"
    echo "[prod-start] admin 언어 ko 주입 완료"
  fi

  [ -f /app/scripts/ko-terms.sh ] && sh /app/scripts/ko-terms.sh || echo "[prod-start] ko-terms skip"
  [ -f /app/scripts/admin-login-redirect.sh ] && sh /app/scripts/admin-login-redirect.sh || echo "[prod-start] login-redirect skip"

  cd "$SERVER"
  echo "[prod-start] 스토어 이름 동기화 (APP_NAME_KO=${APP_NAME_KO:-쇼핑몰})"
  npx medusa exec ./src/scripts/set-store-name.js || echo "[prod-start] 스토어 이름 동기화 실패(무시)"
  exec npx medusa start
else
  cd /app
  exec npx medusa develop -H 0.0.0.0
fi

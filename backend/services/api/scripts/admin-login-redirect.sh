#!/bin/sh
# 로그인 성공 후 기본 이동 경로를 대시보드로 변경.
#   Medusa 로그인: from = location.state?.from?.pathname || "/orders"; navigate(from, {replace:true})
#   - /app 루트로 접근하면 from="/" 가 되어 기본값 치환만으로는 부족 → navigate 인자 자체를 /dashboard 로 강제.
#   - pre-built 번들 내부 로직이라 정식 확장으로 못 바꿈 → 해당 패턴만 정확히 치환.
# - 대상: served 번들의 login 청크(login-*.js). navigate 호출이 유일(검증)해 안전.
# - in-place + 멱등(치환 후 인자가 "/dashboard" 리터럴이라 정규식 재매칭 안 됨).
# - ko-terms.sh 이후 실행(ko-terms 가 번들을 재생성하므로).
set -e

TARGET="${ADMIN_HOME_PATH:-/dashboard}"
ADMIN=/app/.medusa/server/public/admin/assets
[ -d "$ADMIN" ] || { echo "[login-redirect] admin assets 없음"; exit 0; }

N=0
# 1) from 기본값("/orders") → 대시보드 (belt)
for F in $(find "$ADMIN" -name '*.js' -exec grep -l 'pathname)||"/orders"' {} + 2>/dev/null); do
  sed -i "s#pathname)||\"/orders\"#pathname)||\"$TARGET\"#g" "$F"
done
# 2) login 청크: navigate(<from>,{replace:!0}) 인자를 대시보드로 강제 (핵심)
for F in $(find "$ADMIN" -name 'login-*.js' 2>/dev/null); do
  before=$(grep -cE '\([A-Za-z_$]+,\{replace:!0\}\)' "$F" 2>/dev/null || echo 0)
  [ "$before" = "0" ] && continue
  sed -E -i "s#([A-Za-z_\$]+)\(([A-Za-z_\$]+),\{replace:!0\}\)#\1(\"$TARGET\",{replace:!0})#g" "$F"
  N=$((N + 1))
done
echo "[login-redirect] 로그인 기본 이동 경로 -> $TARGET (login 청크 $N개 강제 적용)"

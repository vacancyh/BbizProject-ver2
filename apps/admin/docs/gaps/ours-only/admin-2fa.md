# [갭 문서] 관리자 2단계 인증(2FA / TOTP)

> 상태: **DONE** (무비용·옵트인). FEATURE_MATRIX §16.5 + §4.

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 기반(횡단·보안)
- **우리 메뉴 위치**: 쇼핑몰 설정 → **2단계 인증(2FA)**(`/settings/security`)
- **FEATURE_MATRIX 행**: §16.5 admin-2fa, §4 "관리자 2FA(TOTP)"

## 2. 기능 설명
관리자 계정별 옵트인 TOTP(RFC 6238) 2단계 인증. 외부 라이브러리/네트워크 0(순수 Node crypto + 자체 QR 인코더).
- **등록**: `setup` → 시크릿 발급(+QR SVG). 인증앱으로 QR 스캔 또는 수동 키 입력.
- **활성화**: `activate` → 6자리 코드 검증 후 enabled. 이때 **백업 코드 10개** 발급(원문 1회 노출).
- **로그인 2단계**: 비밀번호 통과 후 2FA 활성 계정이면 `verify`(TOTP 또는 백업 코드) 단계 추가.
- **서버측 게이팅**: `verify` 성공 시 해당 로그인 토큰(sha256)을 `admin_totp_session`에 만료(24h)와 함께 저장. `twoFactorGuard` 미들웨어가 2FA 활성 관리자의 **미검증 토큰** `/admin/*` 접근을 403(`2FA_REQUIRED`)로 차단 → 클라이언트 우회 불가. 관리자 클라이언트는 이 코드 수신 시 재로그인 유도.
- **해제**: `DELETE /admin/2fa` → 시크릿·세션·백업코드 폐기.

## 3. 필요 데이터
- `admin_totp`(user_id unique · secret(암호문) · enabled)
- `admin_totp_session`(user_id · token_hash(sha256) · expires_at) — 검증 세션(DB라 다중 인스턴스 안전)
- `admin_2fa_backup_code`(user_id · code_hash(sha256) · used) — 1회용 복구 코드
- Medusa `user`(core)는 email 조회(otpauth 라벨)만, 미수정.

## 4. Medusa API 여부
- Medusa core에 2FA 없음 → **MODULE**(custom) `backend/services/api/src/modules/admin-2fa` + 미들웨어 `src/api/middlewares.ts`(`twoFactorGuard`).
- 라우트: `POST /admin/2fa/setup|activate|verify|backup-codes`, `GET|DELETE /admin/2fa`.
- 유틸: `_utils/totp.ts`(TOTP), `_utils/qr.ts`(QR 인코더, opencv 디코딩 교차검증), `_utils/secret-crypto.ts`(AES-256-GCM).

## 5. 보안 설계 메모
- 시크릿은 **AES-256-GCM 암호화** 저장(`v1:iv.tag.ct`). 키 = env `ADMIN_2FA_SECRET_KEY` > `COOKIE_SECRET`. 운영은 전용 키를 KMS로 주입 권장.
- 잘못된 코드는 **400**(검증 실패) — 401(인증)로 응답하면 관리자 클라이언트가 세션 만료로 오인해 로그아웃되므로 금지.
- 기본 admin 계정은 미활성 유지(E2E/데모 무영향).
- Medusa JWT는 iat 초단위·jti 없음 → 같은 초 로그인은 동일 토큰(동일 세션). per-session jti 도입 시 게이팅 정밀도 향상.

## 6. 구현 결과
- [x] BE: `modules/admin-2fa`(models 3 + service + migration) + `medusa-config.ts` 등록 + `src/api/admin/2fa/*` + `twoFactorGuard`
- [x] 유틸: `_utils/{totp,qr,secret-crypto}.ts`
- [x] FE: `apps/admin/src/app/(admin)/settings/security/page.tsx` + `lib/api/two-factor.ts` + 로그인 2단계(`login/page.tsx`) + 403 `2FA_REQUIRED` 처리(`lib/api/client.ts`)
- [x] 검증: 게이팅 13/13 + 강화(암호화·백업·QR) 18/18 + QR 실디코딩(opencv) 6/6 + 실브라우저 로그인 흐름 PASS. 기존 보안·통신 회귀 없음.
- [x] 운영 강화 후속(무비용): 시크릿 전용키(KMS) · per-session jti · (선택) 백업코드 재발급 UI는 구현됨

# [갭 문서] 보안 하드닝 (횡단)

> 상태: **DONE** (무비용). FEATURE_MATRIX §4 "보안 하드닝". 운영 체크리스트는 [실서비스_연동_백로그 §10](../../../../../docs/실서비스_연동_백로그.md).

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無/부족)
- **도메인**: 기반(횡단)
- **위치**: `backend/services/api/src/api/middlewares.ts` + `src/api/_utils/*` + 프런트 `next.config`

## 2. 적용 항목
| 항목 | 구현 | 효과 |
|---|---|---|
| 주문 IDOR 가드 | `storeOrderOwnershipGuard`(`GET /store/orders/:id`) | 인증 고객은 본인 주문만, 그 외 404(존재 은닉) |
| 인증 rate limit | `authRateLimit`(`/auth/*` POST, 실패 401/400 카운트) | IP 5분 10회 초과 429. 성공 시 리셋 |
| 검색어 rate limit | `popular-search-terms` POST | IP 1분 30건 초과 시 조용히 무시 |
| 비밀번호 정책 | `passwordPolicyGuard`(register/reset) | 8자+영문+숫자. 로그인은 제외(기존 계정 무영향) |
| 입력 길이 상한 | `_utils/text.ts`(리뷰·문의·1:1) | 과대 payload 남용 방지(내용 5000·제목 200·이름 50·이메일 254) |
| 관리자 2FA | `twoFactorGuard` + `admin-2fa` 모듈 | → [admin-2fa.md](./admin-2fa.md) |
| 보안 헤더/CSP | `apps/web`·`apps/admin` `next.config` | X-Frame-Options·X-Content-Type-Options·Referrer-Policy·HSTS·CSP |

## 3. rate limit 저장소 (다중 인스턴스)
- `_utils/rate-limit.ts` — Medusa 캐시 서비스(`Modules.CACHE`) 추상화. 운영에서 `@medusajs/cache-redis` 구성만으로 **다중 인스턴스 공유**(REDIS_URL 기설정). 캐시 미가용 시 인메모리 폴백 + **fail-open**(저장소 장애가 가용성을 막지 않음).
- 2FA 검증 세션은 Postgres(`admin_totp_session`)라 별도 조치 없이 다중 인스턴스 안전.
- 운영은 WAF/API 게이트웨이 rate limit을 1차 방어로 병행 권장.

## 4. 검증 (자동)
- 보안·통신 감사 38/38(IDOR·비번·입력상한·인증가드·격리·rate limit 429·헤더·CORS 포함).
- ✅ XSS 안전(`dangerouslySetInnerHTML` 미사용/신뢰 SVG만), `me/*` 데이터 격리, 주소 IDOR 차단, 동시주문 오버셀 방지.

## 5. 운영 전 잔여(체크리스트 §10)
- `NODE_TLS_REJECT_UNAUTHORIZED=0` 제거·전구간 HTTPS · JWT/COOKIE 시크릿 강랜덤·Secrets Manager · CORS 운영 도메인 한정 · 관리자망 IP/VPN/WAF · 데모 계정/데이터 제거.

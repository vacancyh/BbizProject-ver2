# BbizProject 보안 점검 리포트

- 일자: 2026-07-27 · 대상: `backend/services/api`, `apps/web`, `apps/admin`
- 방법: **정적 코드 감사(4개 도메인 병렬)** + **동적 프로브**(실행 인스턴스 :9009에 실제 공격 시나리오)
- 범위: 웹취약점(OWASP) · 개인정보/PIPA · 암호화/시크릿 · 설정/헤더/의존성
- 산출물: 본 리포트 · `security-probe.mjs`(재실행) · `probe-results.json`

## 종합 결과

| 심각도 | 건수 | 대표 항목 |
|---|---|---|
| 🔴 CRITICAL | 2 | JWT/쿠키 시크릿 `"supersecret"` 폴백, 공개 저장소에 실제 admin 비밀번호 |
| 🟠 HIGH | 7 | RBAC fail-open·미매핑, 커밋된 JWT, 2FA 키 파생, PII 평문, 탈퇴·휴면 PII 파기 미구현 |
| 🟡 MEDIUM | 9 | guard fail-open, refund SUPER 미적용, 2FA 옵션, 리뷰명 미마스킹, audit 마스킹 부족 등 |
| ⚪ LOW | 7 | 백엔드 API 헤더, lookup 레이트리밋, 에러메시지, 로그 id 등 |

**동적 프로브(23개)로 런타임 방어는 강력함을 확인**: IDOR(타인 주문 접근/조작 403·404), 미인증·고객토큰 admin 접근 차단(401), **위조·alg=none JWT 거부**, 리뷰 모더레이션 우회 차단(pending 강제), 에러 스택 미노출, CORS 임의오리진 미반사, 음수·잔액초과 적립금 차단 — **전부 OK**.

---

## ✅ 이번에 적용한 저위험 수정 (커밋 포함)

| # | 항목 | 파일 | 효과 |
|---|---|---|---|
| 1 | 커밋된 admin JWT 추적 해제 + .gitignore 보강 | `.gitignore`, `apps/admin/e2e/.auth/state.json`(untrack) | 향후 인증상태/토큰 커밋 차단(`**/.auth/`,`**/state.json`,`test-results/`) |
| 2 | 시크릿 템플릿 placeholder 화 | `backend/.../.env.template` | `supersecret`·`supersecret-revalidate` → `CHANGE_ME_*` |
| 3 | 공개 예시의 실제 비번 제거 | `.env.example` | `ADMIN_PASSWORD=djemal…` → `CHANGE_ME_LOCAL_ONLY` |
| 4 | 배너 URL 스킴 검증 | `admin/banners/route.ts` | `javascript:`/`data:` 차단(http(s)·상대경로만). 동적검증: 정상 201 / 악성 400 |

> ⚠️ 위 1~3은 **향후 유출을 막는 조치**입니다. 이미 공개 이력에 남은 시크릿은 **반드시 로테이션 + git 이력 스크럽(BFG/filter-repo)** 이 필요합니다(아래 C1·C2·H3).

---

## 🔴 CRITICAL

### C1. JWT/쿠키 서명 시크릿이 `"supersecret"` 로 폴백
- 위치: `backend/services/api/medusa-config.ts:12,15`
  ```ts
  jwtSecret: process.env.JWT_SECRET || "supersecret",
  cookieSecret: process.env.COOKIE_SECRET || "supersecret",
  ```
- 영향: env 미설정 시 **공개적으로 알려진 시크릿**으로 서명 → 공격자가 **admin JWT 위조 = 백엔드 완전 장악**, 세션 쿠키 위조.
- 조치(문서화 — 런타임 변경이라 검토 후 적용 권장):
  ```ts
  const jwtSecret = process.env.JWT_SECRET
  const cookieSecret = process.env.COOKIE_SECRET
  if (process.env.NODE_ENV === "production" && (!jwtSecret || !cookieSecret || jwtSecret === "supersecret")) {
    throw new Error("JWT_SECRET/COOKIE_SECRET must be set to strong random values in production")
  }
  // dev 폴백은 남기되 부팅 시 경고 로그
  ```
  + 운영 시크릿을 시크릿매니저로 주입, 기존 시크릿 로테이션.

### C2. 공개 저장소에 실제 admin/DB 비밀번호 커밋
- 위치: `.env.example` — `ADMIN_PASSWORD=djemalsdlqslek12!@`(개인 비번 패턴), `POSTGRES_PASSWORD=shop_local_2026`
- 영향: 공개 GitHub(`vacancyh/BbizProject-ver2`)에 노출 → 재사용 시 계정/DB 침해. 예시값이 "진짜 비번"으로 훈련됨.
- 조치: **예시값 제거(이번에 ADMIN_PASSWORD 적용)** + **해당 비밀번호 즉시 로테이션(유출 가정)** + **git 이력 스크럽**. POSTGRES_PASSWORD는 로컬 도커 전용이라 예시엔 남겨뒀으나 운영 자격증명 재사용 금지.

---

## 🟠 HIGH

### H1. RBAC가 역할 미지정 관리자에게 fail-open(전체 허용)
- 위치: `src/modules/rbac/service.ts:160-180`, `logic.ts:47` ("roleKey null → 항상 true")
- 영향: Medusa `user`는 기본 역할 없음 → **역할 미지정 관리자 = 전 메뉴 CRUD 허용**. 실질적으로 RBAC off.
- 조치: 미지정 사용자를 **최소권한 기본 역할**로(또는 쓰기 deny), 부트스트랩용 break-glass는 별도.

### H2. 다수 민감 `/admin` 라우트 그룹이 RBAC 미커버(BFLA)
- 위치: `src/api/middlewares.ts` `PATH_MENU_MAP` 누락 — `points`·`settlement`·`sanctions`·`rma`·`exchanges`·`tax-invoices`·`membership`·`consents`·`withdrawal`·`product-curation`·`product-disclosure`·`time-sales`·`legal-docs`·`category-option-map`. `menuFromPath`가 null → `next()`로 통과.
- 영향: 인증된 저권한 운영자도 **적립금 발행·정산 지급확정·고객 제재·환불정책·세금계산서** 등 고위험 실행 가능(기능수준 인가 파괴).
- 조치: 모든 커스텀 admin prefix를 `PATH_MENU_MAP`에 추가 + 미매핑 `/admin/*` 쓰기는 **default-deny**.

### H3. 공개 저장소에 admin JWT/인증상태 커밋(향후 재발 위험)
- 위치: `apps/admin/e2e/.auth/state.json` (추적됨, .gitignore 누락)
- 상태: **이번에 추적 해제 + .gitignore 보강 완료(✅)**. 단, 과거 이력엔 남아있음 → **이력 스크럽 필요**. (해당 토큰은 만료됐으나 C1과 결합 시 위조 가능.)

### H4. 2FA 저장 암호화 키가 COOKIE_SECRET/하드코딩으로 파생
- 위치: `src/api/_utils/secret-crypto.ts:14-19` — `ADMIN_2FA_SECRET_KEY || COOKIE_SECRET || "dev-insecure-2fa-key"`
- (암호 자체는 AES-256-GCM·랜덤 IV·auth tag로 견고) 영향: 키가 `COOKIE_SECRET`(=`supersecret` 가능) 또는 하드코딩으로 떨어지면 **DB 열람자가 모든 TOTP 시크릿 복호화 → 2FA 무력화**.
- 조치: 전용 `ADMIN_2FA_SECRET_KEY` 필수화(운영 미설정 시 부팅 실패), 폴백 제거, KMS 로테이션.

### H5. PII 평문 저장(필드 암호화 부재)
- 위치: `tax-invoice/models/tax-invoice.ts:23`(`biz_no`), `store/orders/[id]/tax-receipt/route.ts:80`(현금영수증 식별번호=대개 휴대폰번호를 주문 메모에 평문 기록). 전 모듈에 필드 암호화 없음.
- 영향: PIPA 규제 대상(사업자번호·현금영수증 식별번호) 단일 DB 덤프로 노출. append-only 메모/감사로그에도 잔존.
- 조치: `biz_no`·현금영수증 식별번호 필드 암호화(기존 AES-GCM 유틸 + 전용키) 또는 토큰화, 자유텍스트 메모에 원문 미기록.

### H6. 회원 탈퇴가 soft-delete만 — PII 파기 미구현 (PIPA)
- 위치: `store/customers/me/withdraw/route.ts:19` `softDeleteCustomers([id])`
- 영향: `deleted_at`만 설정, 이메일·전화·이름·주소 그대로 잔존. **법정 보관기간 후 파기 로직 없음** → PIPA 파기의무 위반 위험.
- 조치: 보관기간 경과 탈퇴자 PII **하드삭제/비식별화** 스케줄 job(법정 필수 주문·정산기록만 비식별 보존).

### H7. 휴면계정 탐지만, 분리보관·파기·사전통지 미구현 (PIPA)
- 위치: `src/modules/customer-dormancy/**` — `classify`/`touch`만 존재.
- 영향: 1년 미접속 휴면 전환·분리보관·30일 전 사전통지·파기 의무 미이행.
- 조치: `classify()` 소비 job으로 사전통지→분리보관→파기 파이프라인 구현. (참고: 이 모듈은 마이그레이션도 누락 — [[통합테스트 FINDINGS]] 참조.)

---

## 🟡 MEDIUM

| ID | 항목 | 위치 | 조치 |
|---|---|---|---|
| M1 | RBAC/2FA/denylist/rate-limit guard가 예외 시 **fail-open** | `middlewares.ts:126-130,149-152,189-192` | 인가 결정은 **fail-closed(403)** + 알림 |
| M2 | 환불·강제취소가 일반 menu 권한만(SUPER 아님) | `admin/orders/[id]/refund`, `orders-kr/[id]/cancel` | 돈 이동 액션에 전용 권한/SUPER 게이트 |
| M3 | admin 2FA 옵트인(강제 아님) | `middlewares.ts:163-193` | SUPER/전관리자 강제 모드 제공 |
| M4 | 리뷰 `author_name` 서버 미마스킹(클라 의존) | `modules/review/service.ts:16-19,66` | 서버에서 `김**` 마스킹 강제 |
| M5 | 감사로그 PII 마스킹 불완전 | `modules/audit/utils/mask-pii.ts` | 키 기반 denylist(name/address/phone/biz_no/`*token*`) 추가 |
| M6 | `REVALIDATE_SECRET` 약한 커밋 기본값 | `.env.template`(✅수정), `.env.example` | 무작위값·미설정 시 거부 |
| M7 | 2FA 백업코드 무염 SHA-256 + `/admin/2fa/verify` 레이트리밋 없음 | `modules/admin-2fa/service.ts:18-20` | salt+slow-hash(or HMAC), verify에 lockout |
| M8 | 쿠키 `secure` 기본 off | `medusa-config.ts:22-26` | 운영(`NODE_ENV==='production'`) 시 `secure:true` 기본 |
| M9 | 배너 `image_url/link_url` 스킴 미검증 | `admin/banners/route.ts` | **✅ 수정 완료**(POST). `[id]` 수정 라우트에도 동일 적용 권장 |

---

## ⚪ LOW

| ID | 항목 | 조치 |
|---|---|---|
| L1 | 백엔드 API 응답에 보안헤더 없음(프론트는 양호) | `middlewares.ts`에 `X-Content-Type-Options: nosniff`,`X-Frame-Options: DENY`,`Referrer-Policy: no-referrer` 헤더 미들웨어 추가 |
| L2 | `/store/orders/lookup` 레이트리밋 없음 + 순차 display_id | 실패기반 레이트리밋 적용 + 비순차 조회토큰 |
| L3 | store 에러가 원문 `error.message` 반환 | `carts/[id]/points:113`, `tax-receipt:63` — 고정 메시지 반환 + 서버만 로깅 |
| L4 | 운영 로그에 `customer_id` 기록 | `subscribers/order-placed-rewards.ts:104` — 제거/해시 |
| L5 | 로그인 레이트리밋 **동시 버스트** 소량 통과 | 12개 동시요청은 lockout 전 통과(순차/후속은 429로 정상 차단). 카운터 원자성 보강 권장 |
| L6 | 프론트 CSP `'unsafe-inline'`·광범위 connect/img-src, dev에도 HSTS | nonce 도입으로 `unsafe-inline` 제거, 호스트 화이트리스트 |
| L7 | seed 스크립트가 평문 비번 로깅(dev 전용) | `seed-all.ts`·`seed-demo-accounts.ts` 로그에서 비번 제거 |

---

## 🟢 검증된 양호 사항 (동적/정적)

- **인젝션 없음**: 프로덕션 코드에 raw SQL/`knex.raw`/문자열 WHERE 0건 — 전부 `query.graph`/MikroORM 파라미터화. 검색(`orders-kr/search`)도 status/정렬 allowlist·in-memory 필터.
- **XSS 없음**: React 자동 이스케이프, 사용자/관리자 콘텐츠에 `dangerouslySetInnerHTML` 미사용(2FA QR SVG만 내부 생성).
- **SSRF/오픈리다이렉트 없음**: 서버 fetch는 고정 env URL만, 리다이렉트는 동일 오리진.
- **IDOR 방어(동적확인)**: 타인 주문 조회/취소/확정/영수증 전부 403·404.
- **인증(동적확인)**: 미인증·고객토큰 admin 401, 위조·**alg=none** JWT 401.
- **모더레이션(동적확인)**: 리뷰 `status=published` 주입 무시(pending 강제).
- **CORS/에러(동적확인)**: 임의 오리진 미반사, 에러 스택·SQL·경로 미노출.
- **암호 기본기**: 비밀번호는 Medusa 기본(scrypt), TOTP는 RFC-6238(HMAC-SHA1 규격), 보안난수는 `crypto.randomBytes`.
- **레이트리밋 구현됨**: `/auth/*` IP 10/5분·계정 5/15분(Redis+메모리 폴백).
- **의존성 최신**: Next `15.5.18`(CVE-2025-29927 패치), `@medusajs 2.15.3`, zod 4. → CI에 `pnpm audit` 추가 권장.

---

## 운영 전 우선순위 (권장 순서)
1. **C1·C2·H3·H4**: 시크릿 폴백 제거+fail-fast, 노출 시크릿 **로테이션 + git 이력 스크럽**, 2FA 전용키. (즉시)
2. **H1·H2**: RBAC 기본 least-privilege + 미매핑 admin 라우트 default-deny, 환불/정산/제재 권한 게이트(M2). (인가)
3. **H5·H6·H7·M4·M5**: PII 암호화 + 탈퇴 파기·휴면 파이프라인 + 마스킹. (PIPA 컴플라이언스)
4. **M1·M3·M7·M8·L1~L2**: fail-closed, 2FA 강제·verify 레이트리밋, 쿠키 secure, API 헤더, lookup 레이트리밋. (하드닝)

재점검: `security-probe.mjs` 재실행(README 참조) + 위 조치 후 `pnpm audit`.

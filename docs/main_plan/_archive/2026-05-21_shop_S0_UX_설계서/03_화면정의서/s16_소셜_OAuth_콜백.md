# s16 — 소셜 OAuth 콜백 (UI 없음 / 라우팅 컴포넌트)

- **박제일**: 2026-05-22
- **2026-05-23 갱신**: 쇼핑몰_전용_QA_v4.md (v4.8) 정합 재정렬. §10 prefix 정정 — MEM-U-021~028 (v4 = 비밀번호 재설정·변경) / MEM-A-001~008 (v4 = 회원 목록·정지) / MEM-U-007 (v4 = 포인트 3,000P) / MEM-A-020~025 (v4 = 멤버십 적립률·계정 잠금) 의미 불일치 → MEM-U-015~017 (소셜 로그인) / MEM-U-005~006 (만 14세·약관) / MEM-U-043/047/048 (정지·블랙리스트) / MEM-A-031 (소셜 ON/OFF) 로 교체.
- **상위 문서**: `00_index.md §3.5 Wave 5`, `../02_정보구조.md §2.1 / §7.1`, `../00_개요.md §2`
- **QA 소스 권위**: `../../쇼핑몰_전용_QA_v4.md` (v4.8 / 741건)
- **연결 도메인**: member (소셜 가입·로그인·계정 연동) · admin (감사 로그)
- **연관 화면**: `s13_로그인.md` (진입) · `s14_회원가입.md` (소셜 신규 가입 분기) · `s32_프로필_배송지_알림.md` (계정 연동 설정)
- **LUMI 시안**: 없음 — **UI 화면이 아닙니다** (라우팅 컴포넌트 + 로딩 스피너 + 에러 분기)

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| URL | `/auth/oauth/[provider]/callback?code=&state=&error=&error_description=` |
| 라우트 타입 | **Dynamic — 서버 라우트 (Next.js Route Handler 또는 Server Action)** / UI 없음 |
| 진입 경로 | **OAuth provider 의 redirect 만 가능** — 사용자가 직접 URL 입력하지 않음 / s13 로그인·s14 회원가입에서 소셜 버튼 클릭 → provider 인증창 → 본 콜백 URL로 redirect |
| 목적 | (1) OAuth Authorization Code 수신 (2) state 파라미터 CSRF 검증 (3) provider 토큰 교환 (access_token / id_token) (4) provider profile 조회 (이메일·이름·고유 id) (5) 회원 매칭 또는 신규 가입 분기 (6) 세션 시작 (httpOnly cookie set) (7) next 파라미터 (또는 직전 페이지) 로 복귀 |
| 액터 | 비로그인 (로그인·가입 흐름 중) — 단 기존 회원이 마이페이지 "소셜 계정 연동" 시도 시 로그인 상태로도 진입 가능 (s32 정합) |
| SEO 인덱싱 | **X (필수)** — `noindex, nofollow` / robots.txt 차단 / 외부 검색 노출 0 |
| Provider 4종 | 카카오 (`/auth/oauth/kakao/callback`) · 네이버 (`/auth/oauth/naver/callback`) · 구글 (`/auth/oauth/google/callback`) · 애플 (`/auth/oauth/apple/callback`) |

---

## 2. 와이어 구조 (UI 없음)

### 2.1 본 화면은 UI 화면이 아닙니다

본 라우트는 **서버 사이드 처리 + 최소 클라이언트 로딩 화면**으로 구성됩니다.

```
┌─────────────────────────────────────────────────────┐
│ (헤더·푸터 미렌더링 — 콜백 처리 중 풀스크린)               │
├─────────────────────────────────────────────────────┤
│                                                       │
│                                                       │
│                   ⏳ (로딩 스피너)                      │
│                                                       │
│              "로그인 중입니다... 잠시만 기다려주세요"        │
│                                                       │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**렌더링 흐름:**
1. provider 가 redirect → 본 라우트 진입
2. **서버 사이드 (Route Handler / Server Action)**: state 검증 → 토큰 교환 → 프로필 조회 → 회원 매칭/생성 → 세션 cookie set
3. 성공: **HTTP 302 redirect** → `next` 파라미터 또는 기본 경로 (`/` 또는 `/mypage`)
4. 실패: **HTTP 302 redirect** → 에러 분기 페이지 (s13 로그인 + 에러 쿼리)
5. 클라이언트 사이드 UI 는 서버 redirect 이전 짧은 시간에만 노출 (스피너 + 안내 문구)

### 2.2 에러 분기 시 UI (s13 로그인 페이지 이동, 본 화면 아님)

- 본 화면이 아니라 s13 로그인 페이지에 `?error=` 쿼리로 redirect
- s13 로그인 페이지가 에러 메시지 노출 책임

---

## 3. 컴포넌트 명세

| 컴포넌트 | 위치 | 데이터 source | 동작 / 상태 |
|---|---|---|---|
| **OAuth Callback Handler (서버)** | Route Handler 또는 Server Action | URL `code`, `state`, `error`, `error_description` | §4 처리 단계 순차 실행 |
| **로딩 스피너 (클라이언트)** | 풀스크린 중앙 | 정적 | provider 인증 직후 본 라우트 진입 ~ 서버 redirect 사이 짧은 시간 노출 |
| **안내 문구 (클라이언트)** | 스피너 아래 | 정적 | "로그인 중입니다... 잠시만 기다려주세요" (Korean) |
| **State CSRF 검증기 (서버)** | 서버 로직 | 세션 또는 단기 cookie 의 state 와 URL `state` 비교 | 불일치 시 에러 분기 |
| **Token Exchange Client (서버)** | 서버 로직 | provider API (`/oauth/token`) | `code` → `{ access_token, id_token, refresh_token, expires_in }` |
| **Profile Fetcher (서버)** | 서버 로직 | provider profile API | `{ provider, provider_user_id, email, email_verified, name, profile_image }` 추출 |
| **회원 매칭/생성 (서버)** | 서버 로직 | DB `oauth_account` + `member` 조인 | (1) `oauth_account` 매칭 → 로그인 (2) 이메일 매칭 → 연동 동의 분기 (3) 신규 → 회원가입 보강 페이지로 |
| **세션 설정 (서버)** | 서버 로직 | httpOnly + Secure + SameSite=Lax cookie | JWT/세션 토큰 발급 + AuditLog 기록 |

---

## 4. 처리 단계 (서버 사이드 시퀀스)

```
1. URL 파싱
   - code, state 추출
   - error 있으면 → §5 에러 분기

2. State CSRF 검증
   - 세션/단기 cookie 의 state 값과 비교
   - 불일치 → §5 (CSRF) 에러 분기

3. provider 토큰 교환
   - POST {provider}/oauth/token
   - body: { code, client_id, client_secret, redirect_uri, grant_type=authorization_code }
   - 응답 4xx/5xx → §5 (TOKEN_EXCHANGE_FAILED) 에러 분기
   - 응답 OK → access_token, id_token 획득

4. provider 프로필 조회
   - GET {provider}/userinfo (또는 id_token 디코드 — 애플은 id_token만)
   - 추출: provider_user_id, email, email_verified, name, profile_image
   - email 미수신 시 → §5 (EMAIL_REQUIRED) 에러 분기 (특히 애플)

5. 회원 매칭/생성 분기
   a. oauth_account 테이블 (provider, provider_user_id) 매칭 → 기존 회원
      → 정지/블랙리스트 검사 → 통과 시 6번
      → 정지/블랙리스트 → §5 (SUSPENDED) 에러 분기
   b. (a) 실패 + email 매칭되는 member 존재
      → "기존 가입 회원입니다. 계정 연동하시겠습니까?" 분기
        → /auth/link?provider=&token=temp_link_token (s14 또는 s32 흡수)
   c. (a)(b) 모두 실패
      → 신규 회원 생성 분기 (필수 추가 정보 입력 페이지)
        → /auth/signup?provider=&temp_token= (s14 OAuth 신규 가입 분기)

6. 세션 설정
   - JWT 또는 세션 토큰 발급 (httpOnly + Secure + SameSite=Lax)
   - DB session 또는 Redis 적재
   - 14세 미만 게이트 (s14와 동일) — 신규 가입 시
   - 약관 동의 게이트 — 미동의 시 약관 동의 페이지로 분기

7. AuditLog 기록
   - { event: "oauth_login", provider, member_id, ip, ua, success: true }

8. Redirect 응답
   - HTTP 302 → next 파라미터 또는 기본 경로 (/mypage 또는 /)
   - next 파라미터 검증 (open redirect 방지 — 내부 경로만)
```

---

## 5. 에러 분기 (모두 s13 로그인 또는 안내 페이지로 302 redirect)

| 에러 코드 | 발생 조건 | redirect 목적지 | s13 노출 메시지 |
|---|---|---|---|
| **USER_CANCEL** | provider 인증창에서 사용자가 "취소" 클릭 / URL `?error=access_denied` 또는 `?error=user_cancel` | `/auth/login?error=oauth_cancel` | "로그인이 취소되었습니다" (조용한 안내) |
| **CSRF_INVALID** | state 불일치 (재생 공격·세션 만료) | `/auth/login?error=csrf` | "보안상 다시 로그인해주세요" |
| **TOKEN_EXCHANGE_FAILED** | provider 토큰 교환 4xx/5xx | `/auth/login?error=server` | "로그인에 실패했습니다. 잠시 후 다시 시도해주세요" |
| **PROFILE_FETCH_FAILED** | provider 프로필 조회 실패 | `/auth/login?error=server` | 동일 |
| **EMAIL_REQUIRED** | provider 가 이메일 미제공 (애플 비공개 등) 또는 이메일 미인증 | `/auth/signup?provider=&error=email_required` | "이메일 제공이 필요합니다. 이메일 입력 후 가입을 완료해주세요" |
| **EMAIL_ALREADY_LINKED_OTHER_PROVIDER** | 같은 이메일이 이미 다른 provider 로 가입됨 | `/auth/login?error=email_other_provider&provider=` | "이미 {provider} 로 가입된 이메일입니다. {provider} 로 로그인해주세요" |
| **SUSPENDED** | 정지 회원 | `/auth/login?error=suspended` | "정지된 계정입니다. 고객센터로 문의해주세요" |
| **BLACKLISTED** | 블랙리스트 회원 | `/auth/login?error=blacklisted` | "이용이 제한된 계정입니다. 고객센터로 문의해주세요" |
| **UNDERAGE** (만 14세 미만 신규 가입) | provider 프로필 생년월일 < 14세 | `/auth/login?error=underage` | "만 14세 이상만 가입 가능합니다" (s14 게이트 정합) |
| **TERMS_NOT_AGREED** | 신규 가입 + 약관 미동의 | `/auth/signup?provider=&temp_token=&need_terms=1` | s14 약관 동의 화면으로 이관 |
| **SERVER_ERROR** | 그 외 모든 예외 | `/auth/login?error=server` | "로그인에 실패했습니다. 잠시 후 다시 시도해주세요" |
| **OPEN_REDIRECT** | next 파라미터가 외부 URL | next 무시 + 기본 경로 (`/` 또는 `/mypage`) | (조용한 처리, 에러 메시지 없음) |

---

## 6. 연결 도메인·API

### 6.1 도메인
| 도메인 | 사용 영역 |
|---|---|
| member | oauth_account 매칭/생성·정지·블랙리스트 검사·14세 게이트·약관 동의 검증·세션 설정 |
| admin (감사 로그) | AuditLog (oauth_login 이벤트 기록) |

### 6.2 API 면 (가설 — Phase 4 확정)

**본 라우트는 외부 provider API 와 내부 DB 만 사용** — 자체 API 면 없음

| 외부 호출 | 메서드 | 비고 |
|---|---|---|
| `{kakao|naver|google|apple}/oauth/token` | POST | Authorization Code → Token 교환 |
| `{provider}/userinfo` 또는 `id_token` 디코드 | GET | 프로필 추출 |

**내부 처리** (Route Handler 내):

| 처리 | 동작 |
|---|---|
| `oauth_account.find_one({provider, provider_user_id})` | DB lookup |
| `member.find_one({email})` | 이메일 매칭 (옵션) |
| `member.create({...})` 또는 `oauth_account.create({...})` | 신규 생성 |
| `session.create({member_id, ...})` | 세션 발급 |
| `audit_log.create({event: "oauth_login", ...})` | 감사 로그 |

---

## 7. 권한·접근 제어

| 액터 | 접근 | 비고 |
|---|---|---|
| 비로그인 | ✓ | 로그인·가입 흐름 (기본) |
| 일반 회원 (로그인 상태) | ✓ | 계정 연동 시도 (s32) — `?link_mode=1` 파라미터 식별 |
| 정지 회원 | △ | OAuth 자체는 진입 가능 / §5 SUSPENDED 분기 |
| 블랙리스트 | △ | 동일 / §5 BLACKLISTED 분기 |
| 관리자 | ✓ | 관리자 OAuth 로그인 = 별도 라우트 (s35 관리자 로그인) — 본 라우트는 사용자용 |

**가드 패턴:**
- middleware 미적용 (본 라우트 자체가 인증 흐름)
- 단 `next` 파라미터 검증 = open redirect 방지 (내부 경로만 허용)
- `?link_mode=1` (로그인 회원의 계정 연동 시) = 별도 검증 (현재 세션과 매칭 검증)

---

## 8. SEO · 접근성 · 성능

### 8.1 SEO
- **robots: `noindex, nofollow`** (HTTP header + meta tag 모두)
- robots.txt `/auth/oauth/*/callback` 명시 차단
- canonical 미설정 (검색 노출 의도 없음)
- 사이트맵 미포함

### 8.2 접근성 (WCAG AA / KWCAG 2.2)
- 로딩 스피너 = `role="status"` + `aria-live="polite"` ("로그인 중입니다") — 스크린 리더 안내
- 키보드 = 인터랙션 없음 (자동 redirect)
- 에러 분기 시 s13 페이지가 접근성 책임 (s13 정합)
- `prefers-reduced-motion` = 스피너 회전 무한 OK (요소 작음) 또는 정적 점 3개 ("...")

### 8.3 성능

| 지표 | 목표 | 전략 |
|---|---|---|
| 본 라우트 처리 시간 | ≤ 3s (provider API 의존) | provider 토큰 교환 = 1~2s 일반 / 5s 초과 시 타임아웃 + SERVER_ERROR |
| 클라이언트 UI 시간 | ≤ 500ms | 서버 redirect 가 빠르면 스피너 거의 안 보임 |

- 서버 사이드 처리 = Next.js Route Handler edge 또는 Node 런타임 (provider SDK 호환성 의존)
- provider API 타임아웃 = 5s 권장 + 1회 재시도
- 세션 cookie 발급 = httpOnly + Secure + SameSite=Lax + 만료 30일 (s13 정합)

---

## 9. 디자인 트랙 연동

- **UI 없음** → 디자인 트랙 작업 사실상 불필요
- 단 짧은 로딩 스피너 + 안내 문구만 디자인 트랙 Sprint 1+ 위임
- 결정 항목 (Sprint 1):
  - 스피너 디자인 (브랜드 로고 회전 vs 표준 spinner vs 점 3개)
  - 안내 문구 카피 ("로그인 중입니다..." vs "잠시만 기다려주세요" 등)
  - 배경 (풀스크린 화이트 vs 그라데이션 vs 로고만)

---

## 10. QA 추적

### 쇼핑몰_전용_QA_v4.md
- **소셜 로그인·신규 가입·계정 연동**: MEM-U-015 (카카오/네이버/구글 소셜 신규 로그인) / MEM-U-016 (이미 이메일 가입 계정에 동일 이메일 소셜 → 연동 안내) / MEM-U-017 (소셜 로그인 연동 해제 후 재로그인 차단)
- **약관 동의·만 14세 게이트 (s14 정합)**: MEM-U-005 (만 14세 미만 차단) / MEM-U-006 (필수 약관 미동의 차단)
- **신규가입 혜택 (소셜 신규 진입 시 적용)**: MEM-U-007 (회원가입 완료 시 포인트 3,000P 즉시 지급) / MEM-U-008 (신규가입 쿠폰 자동 발급)
- **정지·블랙리스트 차단**: MEM-U-043 (계정 정지 후 활성 세션 즉시 강제 만료) / MEM-U-047 (영구정지 후 동일 이메일/전화번호 신규 가입 차단) / MEM-U-048 (블랙리스트 계정 로그인 시도 차단)
- **관리자 소셜 공급자 설정**: MEM-A-031 (소셜 로그인 공급자 ON/OFF — 카카오·네이버·구글 개별)

### 공통_인프라_보안_QA.md
- **OAuth CSRF**: **A-AUTH-005 (state 검증)** / A-AUTH-006 (PKCE 권장)
- **세션·쿠키**: A-AUTH-001 (httpOnly) / A-AUTH-002 (Secure) / A-AUTH-003 (SameSite) / A-AUTH-004 (만료)
- **Open Redirect**: **A-AUTH-007 (next 파라미터 내부 경로 검증)**
- **HTTPS**: A-NET-001 / A-NET-005 (CSP)
- **감사 로그**: A-LOG-001 (인증 이벤트) / A-LOG-002 (실패 시도)
- **법령**: A-LAW-005 (개인정보 수집 동의)

---

## 11. 미결·메모

| ID | 내용 | 옵션 | 권장 |
|---|---|---|---|
| s16-Q01 | provider 4종 MVP 범위 | (a) 4종 (카카오·네이버·구글·애플) 모두 MVP (b) 카카오·네이버 우선 + 구글·애플 후속 (c) 카카오만 MVP | (a) 4종 모두 — 애플은 iOS 앱 배포 정책 영향 없음 (앱 없음) / 카카오·네이버·구글·애플 표준 |
| s16-Q02 | 본 라우트 구현 = Server Action vs Route Handler vs API Route | (a) Route Handler (`app/auth/oauth/[provider]/callback/route.ts`) (b) Server Action (c) Pages API Route | (a) Route Handler — Next.js App Router 표준 + redirect 처리 명확 |
| s16-Q03 | 이메일 매칭 시 자동 연동 vs 사용자 동의 후 연동 | (a) 자동 (UX 부드러움) (b) 사용자 동의 후 연동 (보안) (c) 차단 (다른 provider 로 다시 로그인 안내) | (b) 사용자 동의 후 연동 — 보안 우선 + 계정 탈취 방지 |
| s16-Q04 | 신규 가입 시 추가 정보 보강 = MVP 필수 항목 | (a) 이메일·이름만 (provider 제공) + 이용약관·개인정보 동의 (b) + 휴대폰 인증 (c) + 생년월일·성별 | (b) + 휴대폰 인증 — 본인 확인 필수 (s14 정합) |
| s16-Q05 | PKCE (Proof Key for Code Exchange) 적용 | (a) MVP 적용 (보안) (b) 후속 phase (c) provider 별 선택 (카카오·네이버 PKCE 미지원) | (c) provider 별 — 구글·애플 PKCE 적용, 카카오·네이버 state CSRF 만 |
| s16-Q06 | 애플 사용자 비공개 이메일 처리 | (a) 비공개 이메일 (`@privaterelay.appleid.com`) 그대로 사용 (b) 사용자에게 실제 이메일 추가 입력 요청 (c) 차단 (실제 이메일 의무) | (a) 비공개 이메일 그대로 사용 — 애플 정책 존중 + 마케팅 발송 어려움은 별도 안내 |
| s16-Q07 | next 파라미터 허용 경로 화이트리스트 | (a) 내부 경로 (`/` 시작) 만 허용 (b) 화이트리스트 (`/`, `/mypage/*`, `/cart`, `/checkout` 등) (c) 모두 허용 | (a) 내부 경로 — 단순 + open redirect 차단 충분 |
| s16-Q08 | 콜백 처리 타임아웃 | (a) 5s + 1회 재시도 (b) 10s 단일 (c) 3s + 2회 재시도 | (a) 5s + 1회 재시도 — provider 응답 일반 1~2s, 안전 마진 |
| s16-Q09 | 14세 미만 소셜 가입 차단 시점 | (a) provider 프로필에 생년월일 있으면 즉시 차단 (b) provider 프로필에 생년월일 없으면 추가 입력 후 검증 (c) 모두 회원가입 보강 페이지로 이관 후 검증 | (c) 회원가입 보강 페이지로 이관 — provider 별 프로필 항목 차이 흡수 |
| s16-Q10 | 로딩 UI 노출 임계 | (a) 즉시 노출 (b) 200ms 지연 후 노출 (스피너 깜빡임 방지) (c) 미노출 (서버 redirect 가 충분히 빠름 가정) | (b) 200ms 지연 — UX 표준 |

(본 §11 미결 항목은 `_미결사항_통합관리.md` §3 표에 동시 append)

---

## 12. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-22 | 최초 박제 (Round 4 Sub R / Wave 5) — UI 없음 / 라우팅 컴포넌트 정의 | Sub R |
| 2026-05-23 | 쇼핑몰_전용_QA_v4.md (v4.8) 정합 재정렬. §10 prefix 전면 정정 — MEM-U-021~028 (비밀번호 재설정 영역), MEM-A-001~008 (회원 관리 영역), MEM-U-007 (포인트), MEM-A-020~025 (멤버십 등급) 의미 불일치 → MEM-U-015~017 (소셜), MEM-U-005/006 (만 14세·약관), MEM-U-007/008 (신규가입 혜택), MEM-U-043/047/048 (제재), MEM-A-031 (소셜 ON/OFF) 로 교체. | Main |

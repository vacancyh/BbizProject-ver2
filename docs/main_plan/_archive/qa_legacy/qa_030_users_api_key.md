# QA-030 = Users + API Key 관리

**출처**: `메두사_www_apps_user-guide_app_settings_users_page.mdx` · `..._users_invites_page.mdx` · `..._developer_publishable-api-keys_page.mdx` · `..._developer_secret-api-keys_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인 (사장님 계정)

---

## 시나리오 단계

### 1. Admin Users 초대

1. Sidebar -> Settings -> Users
2. "Invite" 또는 Invites 탭
3. **Email** = "manager@local.test"
4. **Role** (옵션)
5. Send invite -> 이메일 토큰 -> 비밀번호 설정

### 2. 자기 프로필 편집

- Settings -> Profile -> First name / Last name / Language / Save

### 3. Publishable API Key 생성 (Storefront 용)

1. Settings -> Developer -> Publishable API keys
2. "Create"
3. **Title** = "Storefront key"
4. Save -> 키 노출 (한번만)
5. Sales channels 섹션 -> Add -> qa_027 채널 매핑

### 4. Secret API Key 생성 (Admin API 자동화 용)

user-guide 인용 (`secret-api-keys_page.mdx`): "Secret API keys are used to authenticate requests to the Admin API. They are tied to a specific admin user."

1. Settings -> Developer -> Secret API keys
2. "Create"
3. **Title** + **Revoke after** (옵션)
4. Save -> 키 노출 (한번만)

### 5. Key Revoke

- Key 상세 -> Revoke -> Confirm (이후 즉시 인증 실패)

---

## PASS 기준

- `user` row 생성 (Invite accept 시)
- Invite 토큰 만료 정책 (24h 권장)
- Publishable key = sales_channel scope 매핑
- Secret key = admin user scope
- Revoke 시 즉시 401

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 만료된 invite 토큰 사용 | 401 |
| 동일 email 재초대 | 차단 또는 중복 검증 |
| Publishable key sales_channel 미매핑 | storefront 빈 상품 |
| Revoke 후 API 호출 | 401 |
| Secret key 노출 위험 | UI 에서 한번만 노출 + 복사 의무 |

---

## 한국 모듈 연동 검증

- 없음


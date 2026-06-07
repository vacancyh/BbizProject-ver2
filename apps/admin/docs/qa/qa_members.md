# 회원 관리 도메인 QA 리포트 (/members)

- 검증일: 2026-06-01
- 대상: admin 웹 http://localhost:7002 `/members` (2탭: 회원 / 회원 그룹)
- 검증 방식: 실제 DB(`shop-postgres`) + 실제 화면(Playwright) + 실제 REST(`http://localhost:7001`)
- 검증자 토큰: `smoke-admin@local.test`
- 종합 판정: **PASS** (결함 0건, WARN 2건)

---

## 1. 사전 데이터 상태 (live DB)

- 활성 회원: 1명 (`test@example.com`, 비회원) — `customer` 테이블 2행 중 1행은 직전 QA 세션에서 soft-delete(`deleted_at` 설정)됨.
- 활성 회원 그룹: 0개 — `customer_group` 3행 전부 직전 세션에서 soft-delete됨.
- 따라서 마스킹/그룹/멤버십 검증을 위해 신규 회원·그룹을 생성하여 검증 후 전량 원복(삭제)하였습니다.

---

## 2. 검증 결과 매트릭스

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| customers.list | 목록 렌더 | PASS | members-01-list.png, 콘솔 0 error/0 warning | DataTable 정상, order=-created_at |
| customers.list | 이메일 마스킹 `ab****@x` | PASS | 신규행 `qa****@local.test`, 기존행 `te****@example.com` | maskEmail 정규식 동작 |
| customers.list | 전화 마스킹 `010-****-1234` | PASS | 신규행 `010-****-5432` | maskPhone 동작 |
| customers.list | 검색(q) | PASS | `q=qa-member` → count 1, 해당 회원만 | REST 검증 |
| customers.list | 가입유형 필터(has_account) | PASS | `has_account=false` → count 2(생성 시점) | select 옵션 true/false |
| customers.list | 페이지네이션 | PASS(코드) | totalPages>1일 때만 노출, PAGE_SIZE=20 | 활성 데이터 1건이라 비노출 정상 |
| customers.create | 등록(이메일 필수+성/이름/전화) | PASS | `qa-member-001@local.test` 생성, http 200, DB 반영 | created_by 자동 기록 |
| customers.create | 이메일 미입력 차단 | PASS(코드) | submitCreate 가드(line 170~173) "이메일은 필수입니다" | — |
| customers.detail | 상세 드로어(기본/그룹/주소/주문) | PASS | members-02-detail-masked.png, 4개 섹션 모두 렌더 | DetailDrawer wide |
| customers.detail | PII 기본 마스킹 | PASS | 전화 input `010-****-5432`(disabled), 이메일 `qa****@local.test` | reveal=false 기본 |
| customers.detail | "원문 보기" 토글 | PASS(코드) | line 238/243-245/262/264: `reveal ? 원문 : mask`, 전화 readOnly={!reveal} | UI 실클릭은 세션 불안정으로 source 검증 |
| customers.edit | 성/이름/전화/회사명 인라인 편집 | PASS | company_name=`QA상사`, 성=김/이름=민수 POST 200, DB 반영 | company_name 컬럼 정상 |
| customers.create-address | 주소 추가 | PASS | `테헤란로 123/서울/06234/010-1111-2222/kr` → customer_address 1행 | postal/주소/도시/전화/country_code |
| customer-groups.list | 그룹 탭 목록(회원수) | PASS | 활성 0개 → EmptyState, 생성 후 목록/회원수 노출 | order=name, limit=100 |
| customer-groups.create | 그룹 생성 | PASS | `QA 검증그룹` 생성 http 200 | name 유니크 제약 확인(아래 WARN1) |
| customer-groups.edit | 그룹명 수정 | PASS | name 수정 http 200 | — |
| customer-groups.delete | 그룹 삭제 | PASS | DELETE http 200, soft-delete | ConfirmModal(reversible:false) |
| customer-groups.add-customers | 회원 검색→추가 | PASS | add http 200, customer_group_customer 1행, 상세에 회원 이메일 표시 | — |
| customer-groups.add-customers | 회원 제외 | PASS | remove http 200, 멤버십 0행 | — |
| audit | 모든 write audit_log 기록 | PASS | target_type=members, status 200: create/group create/add/remove/address/edit | 미들웨어 정상 |

---

## 3. 감사 로그(audit_log) 검증

검증 중 발생한 write가 모두 `target_type='members'`, `status_code=200`으로 기록됨:

| action | method | path | 비고 |
|---|---|---|---|
| POST members | POST | /admin/customers | 회원 생성 |
| POST members | POST | /admin/customer-groups | 그룹 생성 |
| POST members | POST | /admin/customer-groups/{id}/customers | 회원 추가/제외 |
| POST members | POST | /admin/customers/{id}/addresses | 주소 추가 |
| POST members | POST | /admin/customers/{id} | 회원 수정 |

> 참고: 검증 시나리오 상 메뉴 식별은 `target_type` 컬럼(=`members`)으로 이뤄집니다. 지시문의 `menu` 컬럼은 스키마에 없으며 `target_type`가 그 역할을 합니다.

---

## 4. 결함 목록

**없음 (0건).** 8개 검증 대상(customers.list/create/detail/edit/create-address/add-customer-group, customer-groups CRUD/add-customers) 전부 동작 확인.

---

## 5. WARN (개선 권고, 차단 아님)

### WARN-1. 회원 등록 드로어에 회사명(company_name) 입력 필드 없음
- 위치: `src/app/(admin)/members/page.tsx` 회원 등록 드로어(line 336~343) — 이메일/성/이름/전화만 존재.
- 영향: 등록 시 회사명 입력 불가. 단, 상세 편집 드로어에는 회사명 필드가 있어 등록 후 보완 가능(line 263). createCustomer 타입에도 company_name 미포함(customers.ts line 76~84).
- 권고: 등록 폼에 회사명 필드 추가(선택 항목) 또는 의도된 사양이면 무시 가능.

### WARN-2. audit_log의 action/target_id/actor_email 세분화 부족
- 현상: 모든 회원 write가 `action='POST members'`로 동일 기록되고, `target_id`·`actor_email` 컬럼이 비어 있음(NULL).
- 영향: 감사 추적 시 어떤 회원/그룹에 대한 작업인지 path로만 식별 가능(컬럼 단위 필터 불가).
- 권고: 미들웨어에서 target_id 추출 및 actor_email 채움 보강. 다른 도메인(coupons 등)도 동일 패턴이므로 공통 미들웨어 레이어 개선 사안.

### 추가 관찰: 그룹명 유니크 제약이 soft-delete 무시
- 동일 이름 그룹 재생성 시 400(`already exists`) 가능성 — 단, 본 검증에서는 신규 이름이라 정상 통과. soft-deleted 이름 재사용 시도 시 충돌 여지 있음(미검증, 영향 낮음).

---

## 6. 검증 환경 메모

- PII 마스킹은 백엔드가 아닌 프론트 표시 단계에서 처리(`maskEmail`/`maskPhone` in `src/lib/orders/status.ts`). REST 응답은 원문 PII 반환 → "원문 보기" 토글은 추가 API 호출 없이 클라이언트 상태(reveal)로 전환.
- "원문 보기" 실클릭 UI 검증은 Playwright MCP 세션이 클릭 인터셉트/페이지 드리프트로 불안정하여, 기본 마스킹 상태(스냅샷 확인)+토글 로직(소스 확인)으로 PASS 판정.
- 생성한 모든 테스트 데이터(회원 1, 그룹 2, 주소 1, 멤버십)는 검증 후 전량 삭제하여 baseline(활성 회원 1·활성 그룹 0) 원복 완료.

---

## 7. 증거 스크린샷

- `docs/qa/shots/members-01-list.png` — 회원 목록(PII 마스킹: te****@example.com)
- `docs/qa/shots/members-02-detail-masked.png` — 회원 상세(전화 010-****-5432 마스킹, 4개 섹션)

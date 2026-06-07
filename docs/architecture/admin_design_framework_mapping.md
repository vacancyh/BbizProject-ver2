# 관리자 디자인 파일 구조 매핑

## 목적
기존 `이커머스 관리자 화면(2).zip`의 정적 디자인 프로토타입을 프로젝트 표준 구조(`framework_structure.md`)에 맞춰 재배치했습니다.

## 원칙
- `apps/admin/`에는 실제 운영자가 보는 관리자 화면 프로토타입을 둡니다.
- `packages/ui/`에는 추후 React/TypeScript 공통 UI 컴포넌트로 추출할 대상을 기록합니다.
- `packages/types/`에는 UI contract와 route/status 정책을 둡니다.
- `modules/commerce-admin/`에는 Medusa 기능 이식 시 도메인별 기준 문서를 둡니다.
- `docs/`에는 사람이 읽는 설계/기획/개발 안내 문서를 둡니다.

## 주요 매핑
| 원본 파일 | 변경 후 위치 | 비고 |
|---|---|---|
| 쇼핑몰 관리자.html | apps/admin/prototype/index.html | 최종 디자인 기준 HTML. script/link 경로 수정 |
| admin.css | apps/admin/prototype/assets/styles/admin.css | 관리자 기본 스타일 |
| admin-ux.css | apps/admin/prototype/assets/styles/admin-ux.css | Modal/UX 보강 스타일 |
| admin-icons.js | apps/admin/prototype/assets/scripts/core/admin-icons.js | 아이콘 헬퍼 |
| admin-components.js | apps/admin/prototype/assets/scripts/core/admin-components.js | 공통 UI 빌더 |
| admin-shell.js | apps/admin/prototype/assets/scripts/core/admin-shell.js | Shell/router/modal/feedback |
| admin-data.js | apps/admin/prototype/assets/scripts/data/admin-data.js | mock data |
| admin-screen-dashboard.js | apps/admin/prototype/assets/scripts/domains/dashboard/admin-screen-dashboard.js | 대시보드 |
| admin-screen-ops.js | apps/admin/prototype/assets/scripts/domains/commerce/admin-screen-ops.js | 주문/상품/회원. 추후 product/order/customer로 분리 필요 |
| admin-screen-misc.js | apps/admin/prototype/assets/scripts/domains/operations/admin-screen-misc.js | 배송/정산/설정 등. 추후 도메인별 분리 필요 |
| index.html + wireframe files | apps/admin/prototype/legacy-wireframe/ | 초기 와이어프레임 보관 |

## 주의
현재 파일은 실행 가능한 정적 프로토타입을 보존하기 위해 JS 내부까지 완전 분리하지 않았습니다. 실제 앱 이식 시에는 `admin-screen-ops.js`와 `admin-screen-misc.js`를 product/order/customer/fulfillment/settlement/settings로 재분해해야 합니다.

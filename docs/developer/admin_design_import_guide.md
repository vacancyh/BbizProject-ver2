# 관리자 디자인 이식 개발 가이드

## 시작 파일
브라우저에서 아래 파일을 열어 디자인을 확인합니다.

```text
apps/admin/prototype/index.html
```

## React/TypeScript 전환 기준
1. `assets/scripts/core/admin-components.js` → `packages/ui` 컴포넌트로 분해
2. `assets/scripts/core/admin-shell.js` → `apps/admin` 레이아웃/router/modal 상태 관리로 전환
3. `assets/scripts/data/admin-data.js` → API adapter 또는 mock fixture로 분리
4. `assets/scripts/domains/*` → 도메인별 page/component로 분리

## 금지
- `admin-screen-ops.js`를 그대로 앱의 최종 도메인 파일로 사용하지 말 것
- 전역 `window.*` 상태를 최종 앱에 유지하지 말 것
- Medusa 기본 Admin 코어를 직접 덮어쓰지 말 것

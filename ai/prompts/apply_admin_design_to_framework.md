# Claude Code Prompt — 관리자 디자인 표준 구조 적용

이 디자인 프로토타입은 프로젝트 표준 구조에 맞춰 재배치되어 있다.

- 디자인 확인: `apps/admin/prototype/index.html`
- 매핑 문서: `docs/architecture/admin_design_framework_mapping.md`
- 이식 가이드: `docs/developer/admin_design_import_guide.md`

작업 시 원본 정적 JS를 그대로 최종 앱에 복붙하지 말고, `apps/admin`, `packages/ui`, `packages/types`, `modules/commerce-admin` 기준으로 React/TypeScript 컴포넌트와 도메인 로직을 분리하라.

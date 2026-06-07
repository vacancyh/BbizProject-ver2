# Admin Design Import Policy

- Medusa 기본 Admin 코어 덮어쓰기 금지
- 전역 window 기반 상태 최종 유지 금지
- 화면 파일은 도메인별로 분리
- 공통 UI는 packages/ui로 추출
- 타입/route/status contract는 packages/types에 기록

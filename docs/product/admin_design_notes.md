# 쇼핑몰 관리자 디자인 노트

## 현재 디자인 기준
- 최종 기준 파일: `apps/admin/prototype/index.html`
- 기존 와이어프레임 기준 파일: `apps/admin/prototype/legacy-wireframe/index.html`

## 유지할 UX
- 깔끔한 SaaS Admin 톤
- 좌측 사이드바 + 상단 검색
- KPI/차트 대시보드
- 테이블 중심 목록 화면
- 중앙 DetailModal
- 위험 작업 ConfirmModal
- 일반 저장 FloatingResult

## 후속 작업
- 정적 HTML/JS → React/TypeScript 전환
- Medusa 기능을 우리 관리자 앱 구조로 이식
- product/order/customer/fulfillment/payment/settlement 도메인별 화면 분리

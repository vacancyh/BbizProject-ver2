# packages/ui/admin-prototype

이 폴더는 디자인 프로토타입에서 추출해야 할 공통 UI 기준을 기록하는 자리입니다.

## 추출 대상
- AdminLayout / Sidebar / Topbar
- SummaryCard / StatusBadge / DataTable
- DetailModal / ConfirmModal / ResultModal / FloatingResult
- ChartCard / EmptyState / LoadingSkeleton

## 현재 상태
현재 ZIP은 정적 HTML/JS 프로토타입입니다. 실제 React/TypeScript 전환 시 `apps/admin/prototype/assets/scripts/core/*`의 역할을 이 폴더의 공통 UI 컴포넌트로 분해합니다.

# 스토어프론트 UI E2E (Playwright)

기존 검증은 **백엔드 API 통합테스트**와 **SSR HTTP 200** 확인까지였고, 클라이언트
하이드레이션·상호작용은 자동 검증 대상이 아니었다. 이 스위트가 그 공백을 메운다.

## 전제
1. 백엔드: `cd backend/services/api && npx medusa develop` (:9000)
2. 스토어프론트: `cd apps/web && pnpm dev` (:8000)
3. 브라우저: 최초 1회 `npx playwright install chromium`

## 실행
```bash
cd apps/web
pnpm test:e2e                 # 전체
pnpm test:e2e:sweep           # 화면 헬스 스윕만
pnpm test:e2e:interactions    # 상호작용만
```
환경변수: `STOREFRONT_URL`(기본 http://localhost:8000), `STOREFRONT_REGION`(기본 `kr`).

## 구성
| 파일 | 내용 |
|---|---|
| `storefront-sweep.spec.ts` | 10개 화면 진입 → 콘솔 에러/런타임 예외/4xx·5xx/빈 화면 수집. 하드 실패: 런타임 예외·5xx·렌더 실패 |
| `storefront-interactions.spec.ts` | 홈 캐러셀·베스트 하이드레이션 / 목록→상세 클라이언트 라우팅 / 옵션 선택→장바구니 담기→카트 반영 / 최근 본 상품(localStorage) / 로그인 실패 에러 렌더 |
| `storefront-checkout.spec.ts` | **체크아웃 전 구간** — ①비회원: 장바구니→주소→배송→결제(무통장입금)→주문완료 ②회원: 로그인→적립금 사용(총액 감소 확인)→주문완료. 회원 계정은 `E2E_MEMBER_EMAIL/PASSWORD`(기본 `gold@kr-demo.local`) |
| `storefront-a11y.spec.ts` | **접근성(axe-core)** — 주요 5화면 WCAG 2.1 A/AA 검사. **critical/serious 위반 0** 이 게이트. `color-contrast` 는 디자인 토큰·브랜드 색 문제라 게이트에서 제외하고 로그로 추적 |
| `storefront-mobile.spec.ts` | **모바일 반응형(Pixel 7)** — 주요 화면 가로 스크롤 없음, 햄버거 메뉴 열림→이동, 상품 담기 CTA 가 뷰포트 안에 위치 |

### 남은 a11y 백로그(게이트 제외, 디자인 결정 필요)
- `text-ui-fg-interactive`(#3b82f6 on #fff) 대비 3.67:1 — WCAG AA 4.5:1 미달. 디자인 토큰 조정 필요.
- 네이버 로그인 버튼(브랜드 색 #03C75A + 흰 글씨) 대비 미달 — 브랜드 가이드와 충돌하므로 별도 판단.

## 참고
- 어드민 쪽 동일 성격 스위트: `apps/admin` → `pnpm test:sweep`(전 화면 32개 + 상호작용).
- 산출물(`test-results/`)은 git 비추적.

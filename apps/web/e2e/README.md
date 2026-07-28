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

## 참고
- 어드민 쪽 동일 성격 스위트: `apps/admin` → `pnpm test:sweep`(전 화면 32개 + 상호작용).
- 산출물(`test-results/`)은 git 비추적.

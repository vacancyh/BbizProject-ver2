# BbizProject 보안 점검 리포트 — 2차 (심화)

- 일자: 2026-07-27 · 대상: `backend/services/api`, `apps/web`
- 방법: 정적 감사 4영역 병렬(비즈로직/결제 · 데이터노출/IDOR · 스토어프론트/Next · DoS/의존성) + `pnpm audit` + 동적 프로브
- 1차 리포트: `SECURITY-REPORT.md`(OWASP·PII·암호화·헤더). 본 2차는 **비즈니스 로직·결제 무결성·데이터 오버페치·자원남용**에 집중.

## 종합 결과

| 심각도 | 건수 | 대표 |
|---|---|---|
| 🔴 HIGH | 6 | **적립금 카트 IDOR/탈취**, 익명 쓰기(리뷰/문의/지원) 레이트리밋 부재, 환불/취소 시 적립·등급 미복원, 적립금 DELETE 이중복원 레이스 |
| 🟡 MEDIUM | ~7 | revalidate 웹훅(미설정 시 개방·임의태그 DoS), 재입고/조회수 레이트리밋 부재, restock 이메일 ReDoS, best-products 익명 풀스캔, 환불 금액상한 미구현(코어 백스톱), 수동결제 place→적립 |
| ⚪ LOW | ~10 | 문의 작성자명 미마스킹, 환불 원장필드 오매핑, 쿠폰 min_order 표시, 적립 pre-discount 과적립, 카트이탈 적립소멸, confirm 멱등없음, body-size 제한, react 핀 등 |
| 의존성 | pnpm audit: high 16·moderate 26·low 1 | 대부분 medusa CLI/빌드체인 **전이 의존성**(brace-expansion·postcss 등) |

## ✅ 이번에 적용한 수정 (회귀검증: 통합 125/125, 동적 PASS)

| # | 심각도 | 항목 | 파일 | 검증 |
|---|---|---|---|---|
| 1 | **HIGH** | 적립금 카트 **소유권 검증**(IDOR/탈취 차단) — POST/DELETE 모두 `cart.customer_id !== 호출자 → 403` | `store/carts/[id]/points/route.ts` | 동적: 타인 카트 403 / 본인 200 |
| 2 | **HIGH** | 익명 쓰기 **레이트리밋**(리뷰/문의/지원/재입고 20·조회수 120·베스트 60 /분/IP) | `middlewares.ts` `ipRateLimit` | 동적: 리뷰 20→429 |
| 3 | MEDIUM | revalidate 웹훅 **fail-closed(운영 시크릿 필수)+상수시간 비교+태그 allowlist** | `apps/web/.../api/revalidate/route.ts` | 타입체크 통과 |
| 4 | MEDIUM | restock 이메일 **길이 상한**(ReDoS 방지, 정규식 전 254 컷) | `store/restock-notifications/route.ts` | 타입체크 |
| 5 | LOW | 상품문의 **작성자명 서버 마스킹**(리뷰와 동일 `홍**`) | `store/products/[id]/inquiries/route.ts` | 타입체크 |

## ✅ 후속 수정 A1/A3 (회귀검증: 통합 125/125, 역적립 in-process PASS)

| # | 심각도 | 항목 | 파일 | 검증 |
|---|---|---|---|---|
| A1 | **HIGH** | 환불/취소 시 **적립금·멤버십 역적립** — 전액/취소=전량·부분환불=비례, 이미 쓴 적립금은 잔액 0 바닥, reasonKey 멱등 | `_utils/reward-reversal.ts`(신규), `customer-point/service.ts`(`reverseAccrualForOrder`), `admin/orders-kr/[id]/cancel`·`admin/orders/[id]/refund` 훅 | in-process: 잔액0바닥·멤버십 누적감소·멱등 PASS |
| A3 | LOW | 환불 취소기록 **원장 필드 오매핑**(points↔coupon) 수정 | `admin/orders/[id]/refund/route.ts` | 타입체크 |

## 📋 문서화(보류 — 위험/기능/정책)

| 심각도 | 항목 | 사유·권장 |
|---|---|---|
| **HIGH** | 적립금 DELETE **이중복원 레이스**(동시 요청 → 포인트 인플레) | 소유권 검증으로 교차사용자 위험은 제거됨. 완전 해결은 per-cart 락(`Modules.LOCKING`)/멱등 키 필요 → 별도 |
| MEDIUM | **환불 금액 상한** 미구현(클라 amount 신뢰) | Medusa 코어가 잔여초과는 백스톱하나, 라우트에 `captured − 기환불` 명시 상한 추가 권장(defense-in-depth) |
| MEDIUM | 수동결제(`pp_system_default`)에서 **place→적립→미결제** | 운영 PG 연동 + 적립을 `payment.captured` 기준으로 게이트 권장 |
| MEDIUM | best-products 익명 풀스캔 | 레이트리밋(적용됨) + **캐시**(Redis TTL) 추가 권장 |
| LOW | 환불 취소기록 **원장 필드 오매핑**(points↔coupon 전치) | `refund/route.ts` 데이터정합 수정(실환불엔 영향 없음) |
| LOW | 전역 **body-size 제한** 미설정 / confirm·request 메모 멱등없음 / 쿠폰 min_order 표시 / react 19.0.5 핀 | 각 경미, 하드닝 백로그 |
| 의존성 | pnpm audit high 16(전이) | Medusa 패치 릴리스 추적 + `pnpm.overrides` 로 brace-expansion≥5.0.8 등 상향 검토(직접 노출 낮음) |

## 🟢 검증된 양호(2차)
- 카트 가격/수량/재고·쿠폰 적용은 Medusa 코어 서버 계산(클라 가격주입 불가), 세금계산서 amount 서버 유래.
- query.graph **fields 클라 제어 없음**(전 라우트 하드코딩 allowlist) → 오버페치 없음. mass-assignment 없음(status/type/id 서버 강제).
- 주문 confirm/request/tax-receipt·me/* 전부 소유권/인증 스코프. lookup 은 email 일치 요구+404(열거 방지).
- next/image `unoptimized:true` → 이미지 프록시 SSRF 표면 없음. JWT 는 httpOnly+sameSite strict 쿠키(서버 전용). 오픈리다이렉트 없음. 리전/통화 서버검증(가격 조작 불가). Next 15.5.18(CVE-2025-29927 패치).
- 리스트 limit 은 서비스층 `Math.min(≤200)` 클램프, bulk-ship items≤100·wishlist≤200 캡.

## 우선순위(권장)
1. (HIGH) 환불/취소 **역적립 subscriber** 구현 → place→earn→refund 악용 차단.
2. (HIGH) 적립금 DELETE 레이스 per-cart 락/멱등.
3. (MEDIUM) 운영 PG 연동 + 적립 capture 게이트, best-products 캐시, 환불 금액상한.
4. (의존성) `pnpm.overrides` 로 high CVE 전이 의존성 상향.

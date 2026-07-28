# 통합테스트 (분할·다중방법, API 계층)

> **현재 상태: 127/127 PASS** (최근 실행 2026-07-28 · 상세는 [REPORT.md](./REPORT.md))
> 이 스위트는 **API 계층**만 다룹니다. 화면·클릭 검증은 각 앱의 UI E2E 를 보세요:
> `apps/web` → `pnpm test:e2e` · `apps/admin` → `pnpm test:sweep` / `pnpm test:qa`

BbizProject 백엔드의 `/store` · `/admin` · `/auth` API를 직접 호출해 전 기능·연계·검색을 검증한다.
**도메인별로 분할된 suite** + **여러 검증 방법**(happy-path · 부정/경계 · 동시성 · DB 교차검증 · 멱등성 · 권한 매트릭스)으로,
한 영역이 실패해도 다른 영역에 영향 없이 독립 실행된다.

## 구조

```
통합테스트/
├─ run-all.mjs          # 러너: suite 들을 독립 실행·집계. 특정 도메인만도 실행 가능
├─ setup-test-db.sh     # 임시 DB(shop_test) 생성→마이그레이션→시드→키 출력
├─ lib/
│  ├─ harness.mjs       # HTTP 클라이언트·기록기·로그인·리포트 생성
│  └─ db.mjs            # DB 교차검증(로컬=docker psql · CI=DB_HOST 지정 시 psql 직접 접속)
├─ suites/
│  ├─ 01-auth.mjs           # A. 인증·계정
│  ├─ 02-customer.mjs       # B. 사용자 기능
│  ├─ 03-catalog.mjs        # C. 카탈로그·콘텐츠
│  ├─ 04-checkout.mjs       # D. 장바구니·주문·결제
│  ├─ 05-admin.mjs          # E. 관리자 기능
│  ├─ 06-linkage.mjs        # F. 연계 시나리오
│  ├─ 07-search.mjs         # G. 검색조건(상품/주문/회원/리뷰)
│  ├─ 08-negative-edge.mjs  # H. 부정·경계
│  ├─ 09-concurrency.mjs    # I. 동시성·레이스
│  └─ 10-idempotency-rbac.mjs # J. 멱등성·권한매트릭스·회원탈퇴
├─ REPORT.md            # 최근 실행 결과(도메인별 표) — 자동 생성
├─ results.json         # 기계용 결과 — 자동 생성
└─ FINDINGS.md          # 큐레이션된 발견사항·비고
```

## 검증 방법(다중)

| 방법 | 설명 | 예 |
|---|---|---|
| happy-path | 정상 요청→기대 응답 | 로그인, 주문, 검색 |
| 부정·경계(H) | 잘못된 입력·경계값이 안전 거부/정제되는지 | 빈 비번, 별점 범위초과, 위조토큰 |
| 동시성·레이스(I) | 동시 요청에 중복/오버셀/유실 없는지 | 중복가입 1건만, 동시적립 lost-update 없음, **재고 1개 동시주문 3건 → 1건만 성공(I5)** |
| DB 교차검증 | API 응답 말고 실제 DB 행을 확인 | 위시리스트 행, 원장 합계=잔액, 주문 레코드 |
| 멱등성(J) | 같은 요청 반복해도 안전 | 반복 찜 dedup, 반복 동의 |
| 권한 매트릭스(J) | (미인증/고객/관리자) × 엔드포인트 접근표 | admin=401/401/200, me=401/200/401 |

## 실행

전제: Docker(`shop-postgres`/`shop-redis`) 기동. 기존 dev 백엔드(:9000)와 **별도 DB·포트**를 쓴다.

```bash
# 1) 임시 테스트 DB 준비 (스크립트가 마지막에 PUBKEY 를 출력)
bash docs/main_plan/user_plan/bizproject/통합테스트/setup-test-db.sh

# 2) 테스트 백엔드를 별도 포트로 기동 (in-memory redis 로 자동 격리)
cd backend/services/api
DATABASE_URL="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test" PORT=9009 npx medusa develop &
#  → "Server is ready on port: 9009" 대기 (curl http://localhost:9009/health = 200)

# 3) 테스트 실행
cd ../../../docs/main_plan/user_plan/bizproject/통합테스트
BASE=http://localhost:9009 PUBKEY=<위 출력값> RUN_STAMP="$(date '+%F %T')" node run-all.mjs

#    특정 도메인만:  node run-all.mjs 05-admin 07-search
#    (파일명 접두/부분 매칭 — "분할 사용")

# 4) 정리 (백엔드 종료 후)
docker exec shop-postgres psql -U shop -d shop -c "DROP DATABASE shop_test;"
```

- 데이터는 임시 `shop_test`에만 쓰므로 dev `shop` DB는 오염되지 않는다.
- 종료코드: 실패 케이스가 있으면 1, 전부 통과면 0.
- CI(야간 워크플로)에서는 러너의 서비스 컨테이너에 `docker exec` 가 불가하므로
  DB 교차검증이 `DB_HOST`(+`DB_PORT`/`DB_USER`/`DB_PASSWORD`) 지정 시 **psql 직접 접속** 모드로 동작한다.

### ⚠️ 재고는 반드시 Admin API 로 조작할 것 (2026-07-28)
`inventory_level` 을 **SQL 로 직접 수정하면 Medusa 의 재고 캐시가 갱신되지 않아**
DB 상 재고가 충분해도 카트 담기가 `insufficient_inventory` 로 계속 실패한다.
반드시 `POST /admin/inventory-items/:id/location-levels/:location_id { stocked_quantity }` 를 사용한다.
(I5 오버셀 테스트도 이 경로로 재고를 세팅/원복한다.)

## ✅ 마이그레이션 누락 근본 해결(2026-07-27)
`product-curation`(위시리스트/조회수)·`customer-dormancy`(휴면)·`tax-invoice`(payout_id) 누락/드리프트는
정식 마이그레이션으로 해결됨(FINDINGS.md 참조). 이제 fresh `db:migrate` 만으로 모든 테이블이 생성되어
`setup-test-db.sh` 의 수동 테이블 보강 단계는 제거됐다.

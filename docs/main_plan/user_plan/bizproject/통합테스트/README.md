# 통합테스트 (API 계층)

BbizProject 백엔드의 `/store` · `/admin` · `/auth` HTTP API를 직접 호출해
**계정 등록/로그인 · 사용자 기능 · 관리자 기능 · 연계 시나리오 · 검색조건**을 검증한다.
UI(브라우저) 없이 API만으로 돌아가므로 빠르고 안정적이며, 응답 근거가 명확하다.

## 파일

| 파일 | 내용 |
|---|---|
| `run-integration-tests.mjs` | 테스트 드라이버(Node, 의존성 없음). 91개 케이스. |
| `REPORT.md` | 최근 실행 결과(영역별 표 + 실패 목록). 드라이버가 자동 생성. |
| `results.json` | 기계용 결과(케이스별 status/pass/근거). |
| `FINDINGS.md` | **큐레이션된 발견사항** — 실패 케이스 근본원인 + 조치법. |

## 검증 영역 (91 케이스)

- **A. 인증·계정** — 관리자/고객 로그인·실패, 회원가입, 중복가입 차단, 데모계정 4종 로그인, 미인증 차단
- **B. 사용자 기능** — 내정보, 배송지 CRUD, 적립금, 멤버십 등급, 동의 조회/변경, 주문 목록/상세, 위시리스트
- **C. 스토어 카탈로그·콘텐츠** — 상품 목록/상세, 리뷰/문의/고시, 쿠폰·타임세일·배너·공지·FAQ·큐레이션·베스트·인기검색어·약관
- **D. 장바구니·주문·결제** — 카트 생성→배송지→배송옵션→쿠폰→적립금→결제세션→주문완료(실제 체크아웃 1건)
- **E. 관리자 기능** — 상품/주문/회원/리뷰큐/프로모션/배너 CRUD/대시보드 + 권한차단(RBAC)·미인증 차단
- **F. 연계 시나리오** — 리뷰 pending→관리자 승인→스토어 노출 / 주문→관리자 검색 / 쿠폰 admin→store / 관리자 적립→고객 잔액 / 문의→답변 / 비회원 주문조회
- **G. 검색조건(영역별 분리)** — G1 상품검색 / G2 주문검색(admin) / G3 회원검색(admin) / G4 리뷰·문의검색(admin), 각 필터·페이지네이션·정렬 케이스
- **Z. 회원 탈퇴(파괴적)** — 탈퇴 후 접근 차단 확인(신규 임시계정으로만 수행)

## 재실행 방법

전제: Docker(`shop-postgres`/`shop-redis`) 기동. 기존 dev 백엔드(:9000)와 **충돌하지 않도록** 별도 DB·포트를 쓴다.

```bash
cd backend/services/api

# 1) 임시 테스트 DB 생성 + 마이그레이션 + 시드
docker exec shop-postgres psql -U shop -d shop -c "DROP DATABASE IF EXISTS shop_test; CREATE DATABASE shop_test;"
DB="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test"
DATABASE_URL="$DB" NODE_TLS_REJECT_UNAUTHORIZED=0 npx medusa db:migrate
DATABASE_URL="$DB" NODE_TLS_REJECT_UNAUTHORIZED=0 npx medusa exec ./src/scripts/seed-all.ts

# 2) 테스트 백엔드를 별도 포트(:9009)로 기동 (in-memory redis 로 격리됨)
DATABASE_URL="$DB" PORT=9009 NODE_TLS_REJECT_UNAUTHORIZED=0 npx medusa develop &
#   → "Server is ready on port: 9009" 대기 (curl http://localhost:9009/health = 200)

# 3) 퍼블리셔블 키 조회 후 드라이버 실행
PUBKEY=$(docker exec shop-postgres psql -U shop -d shop_test -t -c "select token from api_key where type='publishable' limit 1;" | tr -d ' ')
cd ../../../docs/main_plan/user_plan/bizproject/통합테스트
BASE=http://localhost:9009 PUBKEY=$PUBKEY RUN_STAMP="$(date '+%Y-%m-%d %H:%M:%S')" node run-integration-tests.mjs

# 4) 정리
#   백엔드 프로세스 종료 후:
docker exec shop-postgres psql -U shop -d shop -c "DROP DATABASE shop_test;"
```

- 드라이버는 `BASE`, `PUBKEY` 환경변수만 있으면 어떤 시드된 백엔드에도 붙는다.
- 종료코드: 실패 케이스가 있으면 1, 전부 통과면 0.
- 데이터는 임시 DB(`shop_test`)에만 쓰므로 dev `shop` DB는 오염되지 않는다.

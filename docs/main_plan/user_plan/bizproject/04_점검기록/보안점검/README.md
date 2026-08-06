# 보안 점검 (Security Review)

`backend/services/api` · `apps/web` · `apps/admin` 대상 방어적 보안 감사.
**정적 코드 감사 4개 도메인**(웹취약점/개인정보·PIPA/암호화·시크릿/설정·헤더·의존성) +
**동적 프로브**(실행 인스턴스에 실제 공격 시나리오)로 이중 확인.

> 📌 **최신 상태는 [전체점검 현황 로드맵](../전체점검_현황_로드맵.md)** 이 단일 소스입니다.
> 이 폴더 문서들은 감사 시점별 기록(07-27 1·2차 / 07-28 후속 / 07-29 판매전 / 08-03 전면 / 08-04 레이트리밋)입니다.

## 리포트
| 파일 | 내용 |
|---|---|
| `SECURITY-REPORT.md` | 1차 종합 — 심각도별 발견사항 + 조치법 + 양호 사항 |
| `SECURITY-REPORT-2.md` | 2차 심화 — 비즈로직·IDOR·DoS·의존성 |
| `PRESALE-AUDIT-2026-07-29.md` | **판매 전 종합 점검** — 9가지 방법 교차 검증 + 사장님 확인 사항 |
| `AUDIT-2026-08-03.md` | **전면 점검** — 동시성 금전 결함 3건(실측) · 의존성 · 수용한 위험 |
| `AUDIT-2026-08-04.md` | **레이트리밋 우회**(실측) · 키 로테이션 함정 · preflight 거짓 초록불 |
| `A4-의존성-overrides.md` | CVE override 판단 근거 |
| `C2-시크릿-로테이션-절차.md` | **시크릿 교체 절차** — ⚠️ 0단계(재암호화)를 먼저 읽을 것 |

## 실행 가능한 프로브
찾은 결함이 **다시 생기면 즉시 잡히도록** 남긴 것들이다. 결과 문서만 남기지 않는다.

| 파일 | 케이스 | 무엇을 던지나 |
|---|---|---|
| `presale-security-probe.mjs` | 27 | 인증·인가·IDOR·인젝션·헤더·레이트리밋 |
| `audit2-probe.mjs` | 19 | 토큰위조·권한상승·입력경계·재고 오버셀 |
| `audit3-concurrency-probe.mjs` | 6 | **동시 이중집행** — 적립금·환불·취소 |
| `audit4-ratelimit-probe.mjs` | 3 | **레이트리밋 버킷 위조** — XFF 헤더로 제한 우회 |
| `audit5-shared-bucket-probe.mjs` | 5 | **버킷 공유** — 한도가 고객별인지 쇼핑몰 전체 합산인지 |
| `audit5-login-lockout-probe.mjs` | 3 | **전체 로그인 마비** — 남의 실패가 정상 고객을 막는지 |
| `../통합테스트/journey-probe.mjs` | 19 | **구매 전 과정 실주행** — 가입→주문→조회→적립 |
| `security-probe.mjs` | — | 1차 드라이버(IDOR·인증우회·헤더·CORS·모더레이션) |
| `presale-abuse-probe.mjs` | 11 | 적립금·쿠폰·주문·권한경계 남용 |
| `presale-xss-render-check.mjs` | — | 저장형 XSS 가 실제 화면에서 이스케이프되는지(원복 포함) |
| `presale-perf-probe.mjs` | — | 응답시간·동시부하 스모크 |
| `storefront-readiness-probe.mjs` | — | 고객 화면 준비 상태 |
| `probe-results.json` | — | 최근 프로브 결과(기계용) |

> ⚠️ `audit3-concurrency-probe.mjs` · `journey-probe.mjs` 는 **실제 주문을 만들고 재고를 차감**한다.
> 운영 DB 에는 절대 돌리지 말 것. 돌린 뒤에는 재고를 복구한다:
> `cd backend/services/api && npx medusa exec ./src/scripts/seed-inventory.ts`
> (안 하면 다른 E2E 가 `insufficient inventory` 로 깨진다 — 2026-08-04 실제 발생)
>
> ⚠️ `audit4`·`audit5` 프로브는 429 카운터를 채운다. 운영 금지이며,
> 연달아 돌릴 때는 창(1분)이 지나기를 기다려야 결과가 정확하다.

## 동적 프로브 재실행
전제: 시드된 백엔드가 기동(통합테스트와 동일 환경 재사용). `../통합테스트/setup-test-db.sh`로 임시 DB 준비 후:
```bash
cd backend/services/api
DATABASE_URL="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test" PORT=9009 npx medusa develop &
# 준비되면:
cd ../../../docs/main_plan/user_plan/bizproject/04_점검기록/보안점검
BASE=http://localhost:9009 PUBKEY=<pk_...> node security-probe.mjs
```
결과: `OK`(방어 정상) / `WEAK`(약점) / `INFO`. WEAK 항목은 SECURITY-REPORT.md 에 종합.

## 이번 점검에서 적용한 수정 (저위험)
- `.gitignore` 보강 + 커밋됐던 admin JWT(`apps/admin/e2e/.auth/state.json`) 추적 해제
- `.env.template`·`.env.example` 의 실제/약한 시크릿을 placeholder 로 교체
- 배너 URL 스킴 검증(`javascript:`/`data:` 차단) — 동적 검증 완료

## 남은 조치 (문서화 — 검토 후 적용)
SECURITY-REPORT.md 의 "운영 전 우선순위" 참조. 최상위: 시크릿 폴백 제거+fail-fast,
노출 시크릿 **로테이션 + git 이력 스크럽**, RBAC 기본 least-privilege·미매핑 admin default-deny,
PII 암호화 + 탈퇴/휴면 파기 파이프라인(PIPA).

# 보안 점검 (Security Review)

`backend/services/api` · `apps/web` · `apps/admin` 대상 방어적 보안 감사.
**정적 코드 감사 4개 도메인**(웹취약점/개인정보·PIPA/암호화·시크릿/설정·헤더·의존성) +
**동적 프로브**(실행 인스턴스에 실제 공격 시나리오)로 이중 확인.

> 📌 **최신 상태는 [전체점검 현황 로드맵](../전체점검_현황_로드맵.md)** 이 단일 소스입니다.
> 이 폴더 문서들은 감사 시점별 기록(1차 07-27 / 2차 07-27 / 후속 07-28)입니다.

## 파일
| 파일 | 내용 |
|---|---|
| `SECURITY-REPORT.md` | **종합 리포트** — 심각도별 발견사항 + 조치법 + 적용한 수정 + 양호 사항 |
| `security-probe.mjs` | 동적 프로브 드라이버(IDOR·인증우회·헤더·레이트리밋·CORS·모더레이션·비즈로직) |
| `probe-results.json` | 최근 프로브 결과(기계용) |
| `PRESALE-AUDIT-2026-07-29.md` | **판매 전 종합 점검 리포트** — 9가지 방법 교차 검증 결과 + 사장님 확인 사항 |
| `presale-security-probe.mjs` | 인증·인가·IDOR·인젝션·헤더·레이트리밋 27케이스 |
| `presale-abuse-probe.mjs` | 적립금·쿠폰·주문·권한경계 남용 11케이스 |
| `presale-xss-render-check.mjs` | 저장형 XSS 가 실제 화면에서 이스케이프되는지(원복 포함) |
| `presale-perf-probe.mjs` | 응답시간·동시부하 스모크 |

## 동적 프로브 재실행
전제: 시드된 백엔드가 기동(통합테스트와 동일 환경 재사용). `../통합테스트/setup-test-db.sh`로 임시 DB 준비 후:
```bash
cd backend/services/api
DATABASE_URL="postgres://shop:shop_local_2026@127.0.0.1:5434/shop_test" PORT=9009 npx medusa develop &
# 준비되면:
cd ../../../docs/main_plan/user_plan/bizproject/보안점검
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

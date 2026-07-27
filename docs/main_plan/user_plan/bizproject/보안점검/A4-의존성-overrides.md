# A4 — 의존성 CVE(pnpm audit) 대응

- 일자: 2026-07-27 · `pnpm audit` 결과: high 16 · moderate 26 · low 1 (각 앱 lockfile 기준)
- 결론: **high 13개 모듈은 전부 `@medusajs/*`·Next 의 전이/내부 의존성**. 런타임 요청경로 직접 노출은 낮고,
  다수는 빌드/툴체인(glob·postcss·vite·opentelemetry)이다.

## high 모듈 목록 (backend 기준)

| 모듈 | 성격 | patched(권장) |
|---|---|---|
| @mikro-orm/knex | 프레임워크(ORM) 핀 | >=6.6.14 |
| @opentelemetry/* (sdk-node·exporter-prometheus·propagator-jaeger) | 관측성(선택) | >=0.217.0 / >=2.9.0 |
| axios | HTTP 클라 | >=1.18.0 |
| brace-expansion | glob(빌드) 전이 | >=2.0.2 등 |
| form-data | multipart | >=4.0.6 |
| immutable | 전이 | >=5.1.8 |
| js-yaml | 설정 파싱 | >=3.15.0/4.x |
| lodash | 유틸 | (표시 4.17.24 — 현행 4.17.21이 최신, 확인 필요) |
| multer | 업로드 | >=2.2.0 |
| postcss | CSS(빌드) | >=8.5.18 |
| vite | admin 번들러 | >=6.4.3 |

## ⚠️ 왜 지금 강제 override 하지 않았나
1. **프레임워크 핀 충돌 위험**: `@mikro-orm/knex`·`vite`·`axios`·`multer` 등은 Medusa/Next 가 특정 버전에 의존.
   `pnpm.overrides` 로 상향 강제 시 프레임워크가 깨질 수 있음(무인 상태에서 위험).
2. **일부 patched 버전이 미출시**로 보임(axios 1.18.0·lodash 4.17.24·brace-expansion 5.0.8) → 강제 시 install 실패 가능.
3. **코퍼레이트 TLS(MITM)** 로 재설치가 불안정 — 무인 install 실패 시 개발환경 파손 위험.
→ 상기 이유로 **CI 정보성 audit(추이 관찰)** + 아래 권장 블록 문서화로 대체(운영/정상 네트워크 환경에서 검증 후 적용 권장).

## 권장 적용 절차 (정상 환경에서)
1. 우선 **프레임워크 업그레이드로 자연 해소**를 확인: `@medusajs/*` 패치 릴리스가 전이 의존성을 올리는지 추적.
2. 남는 leaf 전이 의존성만 선별 override — 각 앱 `package.json` 에 추가 후 `pnpm install` + `tsc --noEmit` + (web/admin) `pnpm build` 회귀:
   ```jsonc
   // backend/services/api/package.json (예시 — 버전 존재 확인 후)
   "pnpm": {
     "overrides": {
       "postcss": ">=8.5.18",
       "brace-expansion": ">=2.0.2",
       "form-data": ">=4.0.6",
       "js-yaml": ">=4.1.0",
       "immutable": ">=5.1.8"
     }
   }
   ```
   (apps/web·apps/admin 에도 동일 패턴. `@mikro-orm/knex`·`vite`·`axios`·`multer` 는 프레임워크 확인 후 신중히.)
3. 적용 후 `pnpm audit --audit-level=high` 재확인 → 통합테스트 125/125 회귀.

## 재발 방지(적용됨)
- CI(`.github/workflows/ci.yml`)에 **의존성 audit(정보성)** + **gitleaks 시크릿 스캔(게이트)** 추가 → high 추이·신규 시크릿 유입 감시.

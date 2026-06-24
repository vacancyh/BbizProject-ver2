# Medusa 복사 이식 — 경로 수정 맵 (1단계 산출물)

작성: 2026-06-01 · 목적: `medusa_backup` → `backend/services/api` **복사**(이동 아님) 시 수정해야 할 경로를 전수 문서화. 3단계에서 본 문서대로만 수정한다.

## 0. 결론 (먼저)
- **호스트 경로를 가진 파일 = `docker-compose.yml` 1개뿐.** 나머지는 전부 `/app` 기준 컨테이너 내부 상대경로 → 복사하면 그대로 동작.
- 즉 **서비스당 2줄(`context`, `volume`) × 2서비스 = 4줄** 수정이 전부.
- `medusa_backup`은 GREEN 백업으로 **보존**(복사 원본).

## 1. 이동 단위 = 모노레포 전체
```
medusa_backup/apps/backend/            ← pnpm 워크스페이스 루트 (name: "backend", turbo)
├── package.json / pnpm-lock.yaml / pnpm-workspace.yaml / turbo.json / .npmrc
├── scripts/  (prod-start.sh, ko-terms.sh, brand-i18n.sh, admin-login-redirect.sh, ko-terms.map)
└── apps/
    ├── backend/      ← Medusa 앱 (@dtc/backend)  ← 컨테이너 /app/apps/backend
    └── storefront/   ← Next.js 스토어프론트 (@dtc/storefront)  ← /app/apps/storefront
```
- 도커는 **이 루트 전체를 `/app`로 마운트**한다. Medusa = `/app/apps/backend`, 스토어프론트 = `/app/apps/storefront`.
- pnpm 의존성은 루트에 hoist(root node_modules 1.0G + apps/backend 46M).

## 2. 경로 참조 전수표

| 파일 | 참조 내용 | 복사 후 수정? |
|---|---|---|
| **docker-compose.yml** | `context: ./apps/backend`, `volume: ./apps/backend:/app` (backend·storefront 각각) | **✅ 수정 (유일)** |
| docker-compose.yml | `dockerfile: apps/backend|storefront/Dockerfile`, `command: /app/scripts/prod-start.sh` | ❌ (context·/app 기준 상대 → 그대로) |
| apps/backend/Dockerfile, apps/storefront/Dockerfile | `COPY package.json ...`, `COPY apps/backend/package.json`, `WORKDIR /app/apps/backend` | ❌ (빌드 context=모노레포 루트 기준 상대) |
| scripts/prod-start.sh | `/app/scripts/...`, `/app/apps/backend`, `.medusa/server` | ❌ (컨테이너 /app 기준) |
| apps/backend/medusa-config.ts | 모듈 `resolve: "./src/modules/..."` | ❌ (앱 루트 상대, 함께 이동) |
| turbo.json / package.json scripts | `--filter=@dtc/backend|storefront` | ❌ (패키지명 기준, 경로 아님) |
| pnpm-lock.yaml | `apps/backend:`, `apps/storefront:` 워크스페이스 키 | ❌ (모노레포 내부 상대) |
| apps/backend/src/modules/rma-extension/index.ts | 주석 `apps/backend/apps/backend/src/links/...` | △ 주석만(기능무관, 선택 정리) |

## 3. 복사 제외 대상 (속도·정합)
- `node_modules/` (루트 1.0G + 각 앱) — 컨테이너는 **named volume**(`shop-backend-node-modules`) 사용 → 호스트 복사 불필요.
- `apps/backend/.medusa/` — 빌드 산출물(컨테이너에서 재생성).
- 복사 명령 예: `rsync -a --exclude node_modules --exclude .medusa medusa_backup/apps/backend/ backend/services/api/`

## 4. 타깃 옵션 (사장님 선택 필요)
| 옵션 | 타깃 | compose 수정 | 추가 작업 | 결과 |
|---|---|---|---|---|
| **A (권장·최소)** | 모노레포 전체 → `backend/services/api/` | context/volume 4줄 | 없음 | Medusa=`backend/services/api/apps/backend`, 스토어프론트 동거 |
| **B (완전 분리)** | Medusa→`backend/services/api`, 스토어프론트→`apps/web` | 4줄 + Dockerfile·pnpm-workspace·lock 재정비 | **있음(워크스페이스 해체+재설치)** | guide 표준에 완전 정합 |

→ **A**가 "한두 군데만 수정" 가설에 부합. B는 워크스페이스 해체라 실제 작업량 큼.

## 5. 3단계 수정 체크리스트 (옵션 A 기준)

> (갱신 2026-06-24) 아래 docker compose 경로는 **사내 TLS 검사로 컨테이너 빌드가 막혀 현재 미사용**입니다. 현행 로컬은 하이브리드: DB/Redis만 Docker(5434/6381), 백엔드(:9000)·관리자(:7002)·스토어프론트(:8000)는 호스트 네이티브 실행. 아래 내용은 향후 컨테이너 배포 시 참고용으로 보존합니다.
1. 새 compose 위치 결정(예: shop 루트 `docker-compose.yml`).
2. `shop-backend`: `context: ./backend/services/api`, `volume: ./backend/services/api:/app` 로 변경.
3. `shop-storefront`: 동일하게 `./backend/services/api`로 변경.
4. (dockerfile/command/scripts 경로는 무수정).
5. `docker compose -p shop up -d` → `/health` 200 + 로그인 + 실DB + 디자인 재확인(4단계). (컨테이너 배포 시 host 포트는 환경에 맞게; 현행 네이티브는 백엔드 :9000)

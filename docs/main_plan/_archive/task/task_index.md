# task_index — shop 단독몰 task 분할 (v1, 2026-05-24)

> 본 문서 = S0 3단계 (task 작성) 의 인덱스 = 큰 틀.
> 연계 흐름 (TIC) + 엣지케이스 (수십~100건) + task_NNN.md 상세 = 다음 라운드 박제.

---

## 1. 분할 원칙

- **task = 한 풀스택 워커 (1~2명) 가 받는 working set** = 사용자 여정 + DDD bounded context 정합
- **기능별 X / 업무별 ○** (사장님 verbatim 2026-05-23 "단위 테스트를 기능별로 쪼개지 않고, 업무별로 쪼갤꺼야")
- **1 task = 1 storyboard + 1 unit_test + 1 qa** (1:1:1:1 매핑)
- **AI 한계 명시** (사장님 verbatim 2026-05-24 "ai는 아직 가기까진 안되잖아") — task 간 연계는 인간 SI 와 달리 자동 소통 X → TIC + G-DATA-PRECHECK 로 보완 (§4.1 참조)

---

## 2. task 10개 (v1)

| # | task | DDD Context | 사용자 여정 | 끝선 | 워커 |
|---|---|---|---|---|---|
| **task-001** | 회원/인증 | Customer | 가입~마이 | 등급 표시 | new-fe + new-bo |
| **task-002** | 관리자-상품관리 | Inventory + Catalog | 등록~노출제어 | 노출 ON/OFF | new-bo |
| **task-003** | 사용자-쇼핑 | Sales (Catalog + Cart) | 메인~장바구니 | "주문하기" 버튼 직전 ★ | new-fe |
| **task-004** | 주문/결제 | Order + Billing | 주문서~결제완료 | OrderPlaced 이벤트 | new-fe + new-bo |
| **task-005** | 청약철회/교환/반품/취소 | Return | 청약철회~환불 | 환불 완료 | new-fe + new-bo |
| **task-006** | 정산 | Settlement | 정산~세금계산서 | 셀러정산 완료 | new-bo |
| **task-007** | 배송 | Fulfilment / Shipment | 운송장~수령 | 배송완료 | new-fe + new-bo |
| **task-008** | 후기 | Review | 작성~조회 | 평점 반영 | new-fe + new-bo |
| **task-009** | 알림 (cross-cutting) | Notification | 알림톡/이메일 | 동의/거부 | new-bo |
| **task-010** | 관리자-운영 (cross-cutting) | Admin | 회원관리~CS | 감사로그/통계 | new-bo |

---

## 3. task DAG (선후관계, AI 자동 소통 불가 보완)

```
task-001 회원/인증
        │
        ▼
task-002 관리자-상품관리 ─── (상품 등록 + 노출 ON → 사용자에게 보임)
        │
        ▼
task-003 사용자-쇼핑 ─────── (메인 ~ 장바구니 ~ "주문하기" 직전)
        │
        ▼
task-004 주문/결제 ────────── (OrderPlaced)
        │
        ├──▶ task-005 청약철회/교환/반품 (결제 존재 시)
        │
        ├──▶ task-006 정산 (결제 존재 시)
        │
        └──▶ task-007 배송 (결제 완료 시)
                │
                ▼
            task-008 후기 (배송 완료 시)

cross-cutting (모든 task 발화점 / 감사):
    task-009 알림
    task-010 관리자-운영
```

### 3.1 데이터 의존 (사장님 verbatim 2026-05-24)

| 의존 흐름 | 의미 |
|---|---|
| 관리자 상품 등록 → 사용자 노출 | task-002 → task-003 |
| 관리자 노출 ON → 사용자에게 보임 | task-002 → task-003 (is_visible=true 만) |
| 상품 존재 → 주문 가능 | task-002 → task-003 → task-004 |
| 주문(결제) 존재 → 교환·반품·취소 | task-004 → task-005 |
| 결제 존재 → 정산 | task-004 → task-006 |

---

## 4. 다음 라운드 (Pending — 사장님 검수 후 진행)

### 4.1 연계 흐름 (TIC: Task Interface Contract)

사장님 verbatim 2026-05-24 "연계흐름에 대해 고민을 많이 해야 한다 — 사람은 서로 소통해가며 왔다 갔다 하는데 ai는 힘들다"

- 각 task 의 **산출_시드 / 전제_시드 / 크로스체크_의무** 박제
- 신규 게이트 **G-DATA-PRECHECK** = task 시작 직전 선행 task 의 산출_시드 SQL 검증
- 풀스택 워커 내부 sub-flow 강제: **BE 모델 → 시드 박기 → BE API → FE 화면 → QA**
- 위반 시 = 선행 task 재실행 (사장님 시나리오 "BE 형 시드 박아줘" 자동화)
- 상세 박제 위치 = task_NNN_<주제>.md 내부

### 4.2 엣지케이스 매트릭스 (수십~100건 단위)

사장님 verbatim 2026-05-24 "엣지케이스 — 내가 예를 준거지 엄청 많아.. 최소 몇십개-100개 단위지"

- 사장님 예시 6건 (다건복합결제 부분취소 / 결제 네트워크 오류 / 대규모 트래픽 / 보안 / 법적 / etc.) = **빙산의 일각**
- 통합 소스 = R1~R9 리서치 (P0 70+ / OD 100+) + Sub A1~A5 검수 + QA v4 + 공통_인프라_보안_QA + 사장님 추가
- 박제 위치 후보 (사장님 결정 대기):
  - (a) `task/_엣지케이스_매트릭스.md` (단일 통합 매트릭스 + task 매핑)
  - (b) 각 `task_NNN_<주제>.md` 내부 분산 (1 task = 자기 엣지케이스만)
  - (c) hybrid: 통합 매트릭스 + 각 task 인덱스 참조
- 권장 = (c) hybrid — AI 가 cross-task 엣지케이스 누락 위험 ↓

### 4.3 task_NNN.md 작성 (1 task = 1 파일)

- 위치: `main_plan/task/task_001_회원인증.md` ~ `task_010_관리자운영.md`
- 형식 (사장님 검수 후 확정):
  - 산출_시드 (DB 상태 + 데이터 N건)
  - 전제_시드 (선행 task 의 산출 검증)
  - 산출_API / 산출_화면
  - 크로스체크_의무
  - 본 task 엣지케이스 (글로벌 매트릭스 참조 + task 고유)
  - 풀스택 sub-flow (BE → 시드 → FE → QA)

### 4.4 후속 단계 (S0 4~6)

- **4단계 (스토리보드)** = ★ 사장님 단독 (Word) — `storyboard/story_NNN_<주제>.docx`
- **5단계 (단위 테스트)** = 사장님 + main — `unit_test/unit_NNN_<주제>.md`
- **6단계 (QA)** = 사장님 + main — `qa/qa_NNN_<주제>.md`

---

## 5. 변경 이력

| 일자 | 버전 | 내용 |
|---|---|---|
| 2026-05-24 | v1 | 초안 — task 10개 분할 + DAG + 다음 라운드 Pending |

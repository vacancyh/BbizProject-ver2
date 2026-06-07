# [갭 문서 템플릿] <기능명>

> 복사해서 `medusa-only/<기능>.md`(갭A) 또는 `ours-only/<기능>.md`(갭B)로 작성.
> FEATURE_MATRIX의 "문서경로" 컬럼과 파일명을 일치시킨다.

## 1. 분류
- **갭유형**: GAP_A(Medusa有·우리 자리 미정) / GAP_B(우리 要求有·Medusa無)
- **도메인**: <주문/상품/회원/…>
- **우리 메뉴 위치**: <사이드바 경로>
- **FEATURE_MATRIX 행**: <해당 행 식별>

## 2. 기능 설명
<무엇을 하는 화면·액션인가. 사용자(운영자) 시나리오.>

## 3. 필요 데이터
<화면/액션이 읽고 쓰는 데이터. 출처(Medusa 모델 / custom 모델 / 외부).>

## 4. Medusa API 여부
- **REST `/admin/*`**: <엔드포인트 존재 여부 + 경로. 없으면 "없음">
- **service/workflow**: <in-process 호출 가능 여부>
- **결론**: REST 직접 / WRAP(얇은 endpoint) / MODULE(custom) 중 택1 + 근거

## 5. 우리 화면 설계 초안
<레이아웃: PageHeader→SummaryCards→FilterBar→DataTable→DetailDrawer 패턴 적용안.
 한국형 보강(라벨/필터/일괄처리). 갭B면 GapBadge("메두사기능없음") 노출 위치.>

## 6. 구현 계획
- [ ] BE: <wrap endpoint 경로 또는 custom module + migration>
- [ ] FE: <apps/admin 화면 + lib/api/<domain>.ts 호출 레이어>
- [ ] 검증: typecheck/build + Playwright(실 DB 렌더) + 핵심 액션 1건 실수행
- [ ] FEATURE_MATRIX 행 상태 갱신

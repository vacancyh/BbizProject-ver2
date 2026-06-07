# s46 — 배너·팝업·공지·FAQ (Admin)

- **박제일**: 2026-05-21
- **갱신일**: 2026-05-23 (QA v4 prefix 정합성 정정 — 가상 CNT-A-* → 실제 **ADM-N-\* / ADM-F-\* / ADM-B-\***)
- **상위 문서**: `00_index.md §3.4 Wave 4`, `../02_정보구조.md §2.4 / §4.3`, `../05_도메인정의서/d21_관리자.md §3.2 시스템 정책` (콘텐츠 CRUD 공통 룰)
- **연결 도메인**: admin (콘텐츠·공지·FAQ 본체) · product (상품 링크 검증) · category (카테고리 링크 검증)
- **LUMI 시안**: (없음) — 디자인 트랙 Sprint 1+ 위임
- **QA 소스 정합성 메모**: `쇼핑몰_전용_QA_v4.md` §11 [관리자] **공지사항 = ADM-N-001~005 / FAQ = ADM-F-001~005 / 배너·팝업 = ADM-B-001~007** 실제 prefix 사용. v0.1 박제의 가상 `CNT-A-*` 인용은 v0.2에서 실제 prefix로 정정.

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| URL | `/admin/content/banners` (메인 히어로·배너) · `/admin/content/popups` (팝업) · `/admin/content/notices` (공지) · `/admin/content/faqs` (FAQ) — **4 통합 페이지(탭 내비)** |
| 라우트 타입 | CSR — 관리자 CRUD 동적 |
| 진입 경로 | 사이드 GNB "콘텐츠 관리" / 대시보드(s36) "활성 배너 N개" 카드 |
| 목적 | (1) 메인 히어로·배너 CRUD + 노출 정책 (위치·기간·노출 우선순위) (2) 팝업 (재방문 7일 다시보지 않기·페이지별 노출 룰) (3) 공지 CRUD (4) FAQ CRUD (카테고리·정렬) |
| 액터 | **MARKETER+** (배너·팝업 CRUD) / **MANAGER+** (공지·FAQ CRUD) / **SUPER** (글로벌 노출 정책) |
| SEO 인덱싱 | X (관리자 페이지). 단 공지(s09)·FAQ(s10)는 사용자 공개(O) — 본 화면은 관리자 CRUD만 |
| 관리자 가드 | middleware: 미인증/MFA → `/admin/login` / CS만(콘텐츠 권한 없음) → 403 |

---

## 2. 와이어 구조 (섹션 단위)

### 2.1 데스크톱 (1280+, max-width 1600)

```
┌────────────────────────────────────────────────────────────────┐
│ 관리자 헤더                                                       │
├──────┬─────────────────────────────────────────────────────────┤
│ 사이드 │ ① 메인 탭 (배너 / 팝업 / 공지 / FAQ)                          │
│ GNB  │                                                          │
│ 콘텐츠✓│ === 탭1: 배너 ===                                          │
│      │ 서브탭 (메인 히어로 / 카테고리 배너 / 띠 배너)                  │
│      │ - [+ 신규 등록]                                            │
│      │ - 리스트 (썸네일·제목·위치·노출 기간·우선순위·상태·CTR·[수정][삭제]) │
│      │ - drag-drop 순서 변경 (우선순위)                              │
│      │                                                          │
│      │ === 탭2: 팝업 ===                                          │
│      │ - [+ 팝업 등록]                                            │
│      │ - 리스트 (썸네일·제목·노출 페이지·다시보지않기 정책·기간·CTR·[수정]) │
│      │                                                          │
│      │ === 탭3: 공지 ===                                          │
│      │ - [+ 공지 작성]                                            │
│      │ - 리스트 (제목·카테고리·고정·발행일·조회수·[수정][발행/숨김]) │
│      │                                                          │
│      │ === 탭4: FAQ ===                                           │
│      │ - 카테고리 관리 (좌) + FAQ 리스트 (우)                        │
│      │ - [+ FAQ 등록], 카테고리별 정렬 drag-drop                     │
└──────┴─────────────────────────────────────────────────────────┘

배너 등록 폼:
- A. 기본 (제목·alt·이미지 업로드(데스크톱+모바일+태블릿 각 3종)·CTA URL)
- B. 노출 위치 (메인 히어로 / 카테고리 / 띠) + 노출 페이지 선택 (메인·카테고리·상품 상세 등)
- C. 노출 기간 (시작·종료)
- D. 우선순위 (정수, 작을수록 우선)
- E. 타겟팅 (전체 / 회원만 / 등급별) — Q-검토 영역
- 미리보기 (데스크톱/태블릿/모바일 시뮬레이션)

팝업 등록 폼:
- A. 기본 (제목·이미지·CTA URL)
- B. 노출 룰 (페이지 선택·노출 빈도·재방문 N일 다시보지않기·세션당 1회)
- C. 노출 기간
- D. 위치·크기 (modal-center / bottom-sheet / corner)

공지·FAQ 폼:
- 제목·카테고리·본문 (Rich Text Editor — 단 BBCode 또는 안전한 Markdown 권장, XSS 차단)
- 고정 토글 (공지만)
- 발행 토글
```

### 2.2 태블릿 (768~1279)
- 탭 유지 / 리스트 칼럼 일부 hide
- 폼 1 컬럼

### 2.3 모바일 (~767) — 응급 대응
- 리스트 카드형
- 폼 작성 비권장 (이미지 업로드·미리보기 제약) — 데스크톱 권장 안내

---

## 3. 컴포넌트 명세

### 3.1 탭1: 배너

| 컴포넌트 | 위치 | 데이터 source | 동작 / 상태 |
|---|---|---|---|
| **서브탭 (히어로/카테고리/띠)** | 탭1 헤더 | URL query | 배너 위치별 분리 |
| **배너 리스트** | 탭1 본문 | `GET /api/admin/banners?position=&status=&from=&to=` | 썸네일·제목·위치·노출 기간·우선순위·status·CTR (집계) |
| **우선순위 drag-drop** | 리스트 | `PATCH /api/admin/banners/reorder` | drag-drop 시 즉시 적용 + 토스트 + AuditLog |
| **배너 등록/수정 폼** | `/banners/new` · `/[id]` | 관리자 입력 → `POST/PATCH /api/admin/banners` | A 기본 / B 노출 위치 / C 기간 / D 우선순위 / E 타겟팅 / 미리보기 |
| **이미지 업로드** | 폼 A | `POST /api/admin/upload` (CDN signed URL) | 데스크톱(1920×600)·태블릿(1024×400)·모바일(640×800) 3종 권장. 형식·용량 검증 (A-FILE-001~010) |
| **CTA URL 검증** | 폼 A | 입력 시 검증 | 내부 URL (`/product/[id]` 등) → 상품 ID 존재 검증. 외부 URL = 도메인 화이트리스트 |
| **노출 페이지 선택** | 폼 B | static + dynamic | 메인 / 카테고리(rings/necklaces/...) / 상품 상세 / 이벤트 등 선택 (다중) |
| **타겟팅** | 폼 E | static | 전체 / 회원만 / 등급별 — MVP는 전체·회원만 (등급은 Phase 4) |
| **미리보기 패널** | 폼 우측 | live form value | 데스크톱/태블릿/모바일 토글 시뮬레이션 |
| **CTR 통계** | 리스트 행 | `GET /api/admin/banners/stats?id=` (캐시 1시간) | 노출/클릭/CTR (최근 7일) |

### 3.2 탭2: 팝업

| 컴포넌트 | 위치 | 데이터 source | 동작 / 상태 |
|---|---|---|---|
| **팝업 리스트** | 탭2 본문 | `GET /api/admin/popups` | 썸네일·제목·노출 페이지·다시보지않기·기간·CTR·[수정][삭제] |
| **팝업 등록/수정 폼** | `/popups/new` · `/[id]` | `POST/PATCH /api/admin/popups` | A 기본 / B 노출 룰 / C 기간 / D 위치·크기 |
| **노출 룰** | 폼 B | 관리자 입력 | 페이지 선택(다중) + 빈도(매 방문/세션당 1회/N일 1회) + 다시보지않기 N일(쿠키) |
| **위치·크기 선택** | 폼 D | static | modal-center / bottom-sheet / corner. 모바일 별도 옵션 |
| **CTR 통계** | 리스트 행 | `/api/admin/popups/stats?id=` | 노출/클릭/닫기 |

### 3.3 탭3: 공지

| 컴포넌트 | 위치 | 데이터 source | 동작 / 상태 |
|---|---|---|---|
| **공지 리스트** | 탭3 본문 | `GET /api/admin/notices?category=&status=&from=&to=` | 제목·카테고리·고정(pin)·발행일·조회수·status |
| **공지 등록/수정 폼** | `/notices/new` · `/[id]` | `POST/PATCH /api/admin/notices` | 제목·카테고리·본문(Rich Text)·고정 토글·발행 토글 |
| **Rich Text Editor** | 폼 본문 | 안전한 RTE (TipTap/Lexical) | 굵게·기울임·링크·이미지(CDN 업로드)·리스트. **HTML 화이트리스트 sanitize** (A-XSS-001) |
| **카테고리 관리** | 별도 모달 | `/api/admin/notice-categories` | 카테고리 CRUD (예: 공지·이벤트·점검·제품) |
| **고정(pin) 토글** | 폼 + 리스트 | `notices.is_pinned` | 사용자 s08 목록 상단 고정 |
| **예약 발행** | 폼 | `notices.publish_at` | 미래 시각 설정 시 cron 자동 발행 |

### 3.4 탭4: FAQ

| 컴포넌트 | 위치 | 데이터 source | 동작 / 상태 |
|---|---|---|---|
| **카테고리 좌측 패널** | 탭4 좌 | `GET /api/admin/faq-categories` | 카테고리 CRUD + drag-drop 정렬 |
| **FAQ 리스트 우측** | 탭4 우 | `GET /api/admin/faqs?category=` | 질문·답변 50자·카테고리·정렬·status |
| **FAQ 등록/수정 폼** | `/faqs/new` · `/[id]` | `POST/PATCH /api/admin/faqs` | 질문·카테고리·답변(Rich Text)·정렬·status |
| **카테고리별 정렬 drag-drop** | 리스트 | `PATCH /api/admin/faqs/reorder` | 사용자 s10 표시 순서 |

### 3.5 공통

| 컴포넌트 | 비고 |
|---|---|
| **AuditLog 박제** | 모든 write = d21 F6 자동 박제 |
| **캐시 PURGE** | 배너·팝업·공지·FAQ 변경 시 CDN/Redis 캐시 즉시 PURGE (사용자 화면 즉시 반영) |
| **이미지 업로드** | CDN signed URL + 파일명 난수화 + 형식·MIME 검증 (A-FILE-001~010) |
| **HTML sanitize** | Rich Text = DOMPurify 또는 서버 sanitize (A-XSS-001) |

---

## 4. 상태 (State Matrix)

| 상태 | UI / 동작 |
|---|---|
| **초기 (탭 로딩)** | skeleton 5행 |
| **데이터 OK** | 정상 표시 |
| **배너 — 노출 기간 만료** | 행 회색 + 뱃지 "EXPIRED" + 자동 status=inactive |
| **배너 — 우선순위 변경 중** | drag 시 살짝 dim + drop 후 토스트 "순서 변경됨" |
| **배너 — 이미지 업로드 실패** | 폼 inline error "파일 형식·용량 검증 실패" |
| **배너 — CTA URL 검증 실패** | 폼 inline error "상품 ID 존재하지 않음" 또는 "외부 도메인 화이트리스트 외" |
| **팝업 — 노출 룰 충돌 (같은 페이지 2개 활성)** | 우선순위 표시 + 경고 "동일 페이지 N개 활성 — 우선순위 1개만 표시됨" |
| **공지 — 예약 발행 대기** | 행 뱃지 "예약: YYYY-MM-DD HH:MM" + 발행 전 수정 가능 |
| **공지 — 고정 5개 초과** | 폼 차단 + 토스트 "고정 공지는 최대 5개" (sNN-Q 미결) |
| **FAQ — 카테고리 0개** | 안내 "카테고리를 먼저 등록해주세요" |
| **권한 부족** | 버튼 disabled + tooltip |
| **캐시 PURGE 실패** | 토스트 "저장 완료 — 캐시 무효화 일부 실패. 5분 내 자동 반영" |
| **CDN 업로드 실패** | inline error + 재시도 버튼 |

---

## 5. 예외·엣지 케이스

| ID | 케이스 | 처리 |
|---|---|---|
| s46-E01 | 배너 CTA URL 상품 삭제됨 | 사용자 측 클릭 시 404 → 자동 비활성 + 관리자 알림 (cron 1일 1회 검증) |
| s46-E02 | 팝업 다시보지않기 쿠키 회원 vs 비회원 분리 | 비회원 = localStorage / 회원 = DB 저장 (cross-device 동기화) |
| s46-E03 | 공지 본문 XSS 시도 (`<script>`) | RTE + 서버 sanitize 양쪽 차단 (A-XSS-001) |
| s46-E04 | 같은 우선순위 배너 다수 | 우선순위 동률 시 created_at desc 보조 정렬 |
| s46-E05 | 배너 이미지 데스크톱만 업로드 (모바일 없음) | 폼 검증 — 3종 모두 필수 또는 fallback 정책 박제 |
| s46-E06 | 공지 예약 발행 시각이 과거 | 폼 검증 차단 |
| s46-E07 | FAQ 카테고리 삭제 시 소속 FAQ 존재 | 모달 "소속 FAQ N개 — (a) 미분류로 이동 (b) 삭제 차단" — 차단 권장 |
| s46-E08 | 이미지 업로드 EXIF GPS 정보 | 서버 EXIF 제거 (d19 F3 동일 룰 — A-FILE-001~010) |
| s46-E09 | 동시에 두 관리자 같은 공지 수정 | DB updated_at 비교 → 충돌 시 모달 "다른 관리자가 수정함 — 새로고침" |
| s46-E10 | 배너 CTR 집계 누락 (분석 도메인 미구현 시) | "—" 표시 + Phase 4 추후 |

---

## 6. 연결 도메인 · API 면

### 6.1 도메인

| 도메인 | 사용 영역 |
|---|---|
| admin (d21) | 콘텐츠 본체·감사 로그·캐시 PURGE |
| product (d12) | 배너 CTA URL 상품 ID 검증 |
| category (d13) | 카테고리 슬러그 검증 |
| (분석 도메인) | CTR 집계 (Phase 4 도입 시) |

### 6.2 API 면

| 엔드포인트 | 메서드 | 권한 | 비고 |
|---|---|---|---|
| `/api/admin/banners` | GET / POST | MARKETER+ | 목록 / 등록 |
| `/api/admin/banners/{id}` | GET / PATCH / DELETE | MARKETER+ | CRUD |
| `/api/admin/banners/reorder` | PATCH | MARKETER+ | 우선순위 변경 |
| `/api/admin/banners/stats` | GET | MARKETER+ | CTR (1시간 캐시) |
| `/api/admin/popups` | GET / POST | MARKETER+ | 목록 / 등록 |
| `/api/admin/popups/{id}` | GET / PATCH / DELETE | MARKETER+ | CRUD |
| `/api/admin/popups/stats` | GET | MARKETER+ | 노출/클릭/닫기 |
| `/api/admin/notices` | GET / POST | MANAGER+ | 목록 / 등록 |
| `/api/admin/notices/{id}` | GET / PATCH / DELETE | MANAGER+ | CRUD |
| `/api/admin/notice-categories` | GET/POST/PATCH/DELETE | MANAGER+ | 카테고리 CRUD |
| `/api/admin/faqs` | GET / POST | MANAGER+ | 목록 / 등록 |
| `/api/admin/faqs/{id}` | GET / PATCH / DELETE | MANAGER+ | CRUD |
| `/api/admin/faqs/reorder` | PATCH | MANAGER+ | 정렬 |
| `/api/admin/faq-categories` | GET/POST/PATCH/DELETE | MANAGER+ | 카테고리 CRUD |
| `/api/admin/upload` | POST | MARKETER+ | CDN signed URL + 메타 |
| `/api/admin/cache/purge` | POST (자동) | (시스템) | 콘텐츠 변경 시 트리거 |

---

## 7. 권한·접근 제어

| 액터 | 배너·팝업 CRUD | 공지·FAQ CRUD | 카테고리 CRUD | 이미지 업로드 |
|---|---|---|---|---|
| OPERATION | 차단 | 차단 | 차단 | 차단 |
| CS | 차단 | 차단 | 차단 | 차단 |
| MARKETER | ✓ | 차단 | 차단 | ✓ |
| MANAGER | ✓ | ✓ | ✓ | ✓ |
| SUPER | ✓ | ✓ | ✓ | ✓ |

**가드**:
- 모든 write = AuditLog (d21 F6)
- 캐시 PURGE 의무 (콘텐츠 변경 즉시 반영)
- 이미지 업로드 = CDN signed URL (직접 업로드 차단)

---

## 8. SEO · 접근성 · 성능

### 8.1 SEO
- `<title>`: "콘텐츠 관리 | LUMI 관리자"
- `robots.txt`: `Disallow: /admin`
- 단 사용자 노출되는 공지·FAQ 본문은 `s09`·`s10`에서 SEO O (canonical 처리)

### 8.2 접근성
- 이미지 업로드 시 alt 의무 필드 (A-COMP-001)
- drag-drop 키보드 대안 (위/아래 버튼 또는 정렬 input)
- RTE 키보드 단축키 (Ctrl+B, Ctrl+I 등)
- 미리보기 시뮬레이션 = 라디오 그룹 (`role="radiogroup"`)
- 폼 검증 에러 = `aria-live="assertive"`

### 8.3 성능
| 지표 | 목표 | 전략 |
|---|---|---|
| 배너·팝업 사용자 노출 | LCP ≤ 2.5s | CDN + WebP + 적응형 (next/image) |
| RTE 본문 저장 | ≤ 1s | sanitize는 서버에서 |
| CTR 집계 | 1시간 캐시 | 분석 도메인 별도 (실시간 불필요) |
| 캐시 PURGE | ≤ 5s 반영 | Redis + CDN 동시 PURGE |

---

## 9. 디자인 트랙 연동

**시안 미보유** — 디자인 트랙 Sprint 1+ 위임.

권장:
- 미리보기 = 실제 사용자 화면(s01·s08·s10) 토큰 재사용
- drag-drop = grip 아이콘 + 드래그 영역 명확
- 이미지 업로드 = 드롭존 + 즉시 미리보기

---

## 10. QA 추적

> 2026-05-23 갱신 — v4 실제 prefix 정정: 가상 CNT-A-* 폐기 → ADM-N-* (공지) / ADM-F-* (FAQ) / ADM-B-* (배너·팝업)

### 쇼핑몰_전용_QA_v4.md §11 [관리자] 공지사항 관리

| 영역 | 시나리오 ID | 비고 |
|---|---|---|
| 공지 CRUD | **ADM-N-001** 신규 등록 (제목·내용·노출 기간) / **ADM-N-002** 수정·삭제 / **ADM-N-003** 노출 순서 변경 / **ADM-N-004** 노출 기간 종료 → 자동 비노출 / **ADM-N-005** 긴급 공지 (상단 고정) 등록·해제 | 본 화면 공지 탭 |

### 쇼핑몰_전용_QA_v4.md §11 [관리자] FAQ 관리

| 영역 | 시나리오 ID | 비고 |
|---|---|---|
| FAQ CRUD | **ADM-F-001** 등록 (카테고리·질문·답변) / **ADM-F-002** 수정·삭제 / **ADM-F-003** 노출 순서 변경 / **ADM-F-004** 등록 후 사용자 FAQ 페이지 조회 확인 (s10 양방향) / **ADM-F-005** FAQ 카테고리 CRUD | 본 화면 FAQ 탭 |

### 쇼핑몰_전용_QA_v4.md §11 [관리자] 배너·팝업 관리

| 영역 | 시나리오 ID | 비고 |
|---|---|---|
| 메인 배너 | **ADM-B-001** 메인 배너 등록 (이미지·링크·기간·순서) / **ADM-B-002** 수정·삭제 / **ADM-B-003** 노출 기간 종료 → 자동 비노출 | 본 화면 배너 탭 |
| 팝업 | **ADM-B-004** 팝업 등록 (이미지·링크·기간·'오늘 하루 안 보기') / **ADM-B-005** '오늘 하루 안 보기' ON/OFF / **ADM-B-006** SVG 업로드 시 악성 스크립트 검증 | 본 화면 팝업 탭 |
| 상단 공지 띠 | **ADM-B-007** 상단 공지 띠 텍스트·링크·노출 여부 설정 | 본 화면 배너 서브탭 띠 |

### 공통_인프라_보안_QA.md

| 영역 | 시나리오 ID | 비고 |
|---|---|---|
| XSS·입력 검증 | A-INJ-002 (Stored XSS) / A-INJ-003 (Reflected XSS) / A-INJ-004 (DOM XSS) | RTE sanitize |
| 파일 업로드 | A-FILE-001 (MIME 위조) / A-FILE-002 (확장자) / A-FILE-003 (크기) / A-FILE-004 (SVG 스크립트) / A-FILE-005 (EXIF) / A-FILE-007 (파일명 난수화) / A-FILE-010 (Zip Slip) | 이미지·SVG 업로드 보안 (ADM-B-006과 직접 연관) |
| 감사 | A-LOG-002 (모든 write 박제) | 콘텐츠 변경 박제 |
| 인가 | A-API-003 (관리자 권한 차단) | CS·OPERATION 가드 |
| 캐시 | A-DB-007 (캐시 무효화) | 콘텐츠 변경 후 즉시 반영 |

---

## 11. 미결·메모

| # | 항목 | 비고 |
|---|---|---|
| s46-Q01 | 4 통합 페이지 vs 4 분리 페이지 | 통합 권장 (사용 빈도 + 사이드 GNB 단순화) — 본 화면은 통합 가정 |
| s46-Q02 | 배너 타겟팅 등급별 노출 | MVP는 전체·회원만, 등급별은 Phase 4 |
| s46-Q03 | 고정 공지 최대 개수 | 5개 권장 (사용자 s08 목록 가독성) |
| s46-Q04 | 배너 이미지 3종 (데스크톱·태블릿·모바일) 필수 vs fallback | 데스크톱 의무 + 나머지 fallback (auto-resize) — fallback 권장 |
| s46-Q05 | 팝업 다시보지않기 회원 cross-device 동기화 | 회원 DB 저장 권장 (UX 일관성) |
| s46-Q06 | Rich Text Editor 선정 (TipTap/Lexical/Quill) | TipTap 권장 (React + 확장성) — Phase 4 |
| s46-Q07 | 외부 URL 도메인 화이트리스트 | LUMI 인스타·유튜브·블로그 한정 권장 |
| s46-Q08 | 공지 카테고리 표준 (공지/이벤트/점검/제품) | 사장님 확정 필요 |
| s46-Q09 | FAQ 검색 기능 (사용자 측 s10) | Phase 4 — 본 화면은 관리자 검색만 |
| s46-Q10 | 콘텐츠 변경 알림 (마케팅 → 회원 발송) | s47 마케팅과 연계 (배너 변경 = 자동 알림 X, 명시적 캠페인만) |

---

## 12. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-21 | 최초 박제 | sub-agent |
| 2026-05-23 | v0.2 — QA v4 prefix 정합성 정정 (가상 CNT-A-* 폐기 → 실제 ADM-N-001~005 공지 / ADM-F-001~005 FAQ / ADM-B-001~007 배너·팝업). 머리말 메모 추가, §10 QA 추적 표 전면 재작성. | main |

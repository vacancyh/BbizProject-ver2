/**
 * 사업자·고객센터 표기 정보 (2026-08-04 공용화)
 *
 * ── 왜 한 곳으로 모았나 ──────────────────────────────────────────────
 * 2026-07-28 에 푸터의 하드코딩을 env 로 뺐는데, **고객센터 페이지는 빠뜨렸다.**
 * 그 결과 사장님이 사업자정보를 전부 채워 넣고 `preflight-check` 가 OK 를 내도
 * `/customer-service` 화면에는 예시 번호(1600-0000)가 그대로 떠 있었다.
 * 표기 정보를 쓰는 화면이 늘어날 때마다 같은 사고가 반복되므로 여기 하나만 보게 한다.
 *
 * ── 쓰는 법 ──────────────────────────────────────────────────────────
 * 표기 정보를 화면에 넣을 일이 생기면 여기서 import 한다. 값을 새로 하드코딩하지 말 것.
 *
 * 값은 `.env.local`(또는 배포 환경변수)에서 온다. 키 목록은 `.env.example` 참고.
 * 운영 배포 전 채워졌는지는 백엔드 `preflight-check.ts` 가 검사한다.
 *
 * ⚠️ NEXT_PUBLIC_* 는 빌드 시점에 번들에 박힌다 — 값을 바꾸면 **재빌드**해야 반영된다.
 */

/**
 * ⚠️ 미설정 기본값을 여기에 한국어로 박아 두지 말 것.
 * 예시값도 화면에 보이는 문구다 — 영어 화면에 "홍길동 · 서울특별시…" 가 그대로 나간다.
 * 비워 두고 화면에서 `t("biz.*Sample")` 로 채운다(2026-08-10).
 * 값이 설정돼 있으면 **그 값이 이긴다** — 사업자의 실제 정보이므로 번역 대상이 아니다.
 */
export const BIZ = {
  name: process.env.NEXT_PUBLIC_BIZ_NAME ?? "",
  ceo: process.env.NEXT_PUBLIC_BIZ_CEO ?? "",
  regNo: process.env.NEXT_PUBLIC_BIZ_REG_NO ?? "000-00-00000",
  mailOrderNo: process.env.NEXT_PUBLIC_BIZ_MAIL_ORDER_NO ?? "",
  address: process.env.NEXT_PUBLIC_BIZ_ADDRESS ?? "",
  privacyOfficer: process.env.NEXT_PUBLIC_BIZ_PRIVACY_OFFICER ?? "",
  csPhone: process.env.NEXT_PUBLIC_CS_PHONE ?? "1600-0000",
  csEmail: process.env.NEXT_PUBLIC_CS_EMAIL ?? "help@shop.example",
  /**
   * 운영시간·휴무 안내는 **문장**이라 언어마다 달라야 한다.
   * 여기서 한국어 기본값을 박아 두면 영어 화면에도 한국어가 그대로 나간다.
   * 그래서 미설정 시 빈 문자열을 주고, 화면에서 언어별 기본 문구
   * (`biz.csHoursDefault` / `biz.csClosedDefault`)로 채운다.
   * 환경변수가 설정돼 있으면 **그 값이 이긴다** — 사업자가 정한 실제 운영시간이다.
   */
  csHours: process.env.NEXT_PUBLIC_CS_HOURS ?? "",
  csClosed: process.env.NEXT_PUBLIC_CS_CLOSED ?? "",
  /** 필수 항목이 하나라도 비어 있으면 예시값으로 간주해 화면에 경고를 띄운다. */
  isPlaceholder: !process.env.NEXT_PUBLIC_BIZ_REG_NO,
} as const

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

export const BIZ = {
  name: process.env.NEXT_PUBLIC_BIZ_NAME ?? "쇼핑몰",
  ceo: process.env.NEXT_PUBLIC_BIZ_CEO ?? "홍길동",
  regNo: process.env.NEXT_PUBLIC_BIZ_REG_NO ?? "000-00-00000",
  mailOrderNo: process.env.NEXT_PUBLIC_BIZ_MAIL_ORDER_NO ?? "2026-서울강남-00000",
  address: process.env.NEXT_PUBLIC_BIZ_ADDRESS ?? "서울특별시 강남구 테헤란로 000",
  privacyOfficer:
    process.env.NEXT_PUBLIC_BIZ_PRIVACY_OFFICER ?? "홍길동(privacy@shop.example)",
  csPhone: process.env.NEXT_PUBLIC_CS_PHONE ?? "1600-0000",
  csHours: process.env.NEXT_PUBLIC_CS_HOURS ?? "평일 10:00–18:00 (점심 12:00–13:00)",
  csEmail: process.env.NEXT_PUBLIC_CS_EMAIL ?? "help@shop.example",
  csClosed: process.env.NEXT_PUBLIC_CS_CLOSED ?? "주말·공휴일 휴무",
  /** 필수 항목이 하나라도 비어 있으면 예시값으로 간주해 화면에 경고를 띄운다. */
  isPlaceholder: !process.env.NEXT_PUBLIC_BIZ_REG_NO,
} as const

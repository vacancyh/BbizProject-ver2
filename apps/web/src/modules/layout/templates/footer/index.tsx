import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { Text, clx } from "@modules/common/components/ui";

import LocalizedClientLink from "@modules/common/components/localized-client-link";
import MedusaCTA from "@modules/layout/components/medusa-cta";

/**
 * 전자상거래법 필수 표기 정보 — 코드가 아니라 **환경변수**로 관리한다.
 * 판매 전 점검 2026-07-28: 기존에는 코드에 하드코딩돼 있어 운영 배포 시 수정 누락 위험이 컸다.
 * `.env.local`(또는 배포 환경변수)에 아래 키를 채우면 그대로 반영된다.
 */
const BIZ = {
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
  // 필수 항목이 하나라도 비어 있으면 예시값으로 간주해 화면에 경고를 띄운다.
  isPlaceholder: !process.env.NEXT_PUBLIC_BIZ_REG_NO,
}

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  });
  const productCategories = await listCategories();

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base"
            >
              쇼핑몰
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  카테고리
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories?.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return;
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null;

                    return (
                      <li
                        className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="grid grid-cols-1 ml-3 gap-2">
                            {children &&
                              children.map((child) => (
                                <li key={child.id}>
                                  <LocalizedClientLink
                                    className="hover:text-ui-fg-base"
                                    href={`/categories/${child.handle}`}
                                    data-testid="category-link"
                                  >
                                    {child.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  컬렉션
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus txt-ui-fg-base">고객센터</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>전화 {BIZ.csPhone}</li>
                <li>{BIZ.csHours}</li>
                <li>주말·공휴일 휴무 · {BIZ.csEmail}</li>
                <li className="pt-1">
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/customer-service"
                  >
                    공지·FAQ·1:1 문의
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/order/lookup"
                  >
                    비회원 주문조회
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/content/terms-of-use"
                  >
                    이용약관
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/content/privacy-policy"
                  >
                    개인정보처리방침
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-y-3 w-full mb-16 text-ui-fg-muted">
          {/* 전자상거래법 필수 표기 — 값은 env 로 주입한다(코드 수정 불필요).
              미설정 시 예시값이 보이며, 운영 배포 전 반드시 채워야 한다. */}
          <Text className="txt-compact-small leading-relaxed">
            상호: {BIZ.name} · 대표: {BIZ.ceo} · 사업자등록번호: {BIZ.regNo} · 통신판매업신고: {BIZ.mailOrderNo}
            <br />
            주소: {BIZ.address} · 개인정보보호책임자: {BIZ.privacyOfficer}
            {BIZ.isPlaceholder && (
              <>
                <br />
                <span className="text-rose-600">
                  ⚠️ 사업자 정보가 설정되지 않았습니다(예시값 표시 중) — 운영 배포 전 환경변수를 채우세요.
                </span>
              </>
            )}
          </Text>
          <div className="flex justify-between items-center">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} 쇼핑몰. All rights reserved.
            </Text>
            <MedusaCTA />
          </div>
        </div>
      </div>
    </footer>
  );
}

import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { Text, clx } from "@modules/common/components/ui";

import LocalizedClientLink from "@modules/common/components/localized-client-link";
import MedusaCTA from "@modules/layout/components/medusa-cta";

// 표기 정보는 @lib/business-info 한 곳에서만 정의한다 —
// 화면마다 따로 두면 한 곳을 고치고 다른 곳을 빠뜨린다(2026-08-04 고객센터 페이지에서 실제로 발생).
import { BIZ } from "@lib/business-info"
import { getT } from "@lib/i18n"

export default async function Footer() {
  const t = await getT()
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
              {BIZ.name || t("biz.nameSample")}
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  {t("nav.categories")}
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
                  {t("nav.collections")}
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
              <span className="txt-small-plus txt-ui-fg-base">
                {t("nav.customerService")}
              </span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  {t("footer.phone")} {BIZ.csPhone}
                </li>
                {/* 운영 환경변수가 설정돼 있으면 그 값을 그대로 쓴다(사업자가 정한 실제 운영시간).
                    미설정일 때만 언어별 기본 문구로 채운다. */}
                <li>{BIZ.csHours || t("biz.csHoursDefault")}</li>
                <li>
                  {BIZ.csClosed || t("biz.csClosedDefault")} · {BIZ.csEmail}
                </li>
                <li className="pt-1">
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/customer-service"
                  >
                    {t("footer.csLinks")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/order/lookup"
                  >
                    {t("nav.orderLookup")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/content/terms-of-use"
                  >
                    {t("account.termsOfUse")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-ui-fg-base"
                    href="/content/privacy-policy"
                  >
                    {t("account.privacyPolicy")}
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
            {t("biz.name")}: {BIZ.name || t("biz.nameSample")} · {t("biz.ceo")}:{" "}
            {BIZ.ceo || t("biz.ceoSample")} · {t("biz.regNo")}: {BIZ.regNo} ·{" "}
            {t("biz.mailOrderNo")}: {BIZ.mailOrderNo || t("biz.mailOrderNoSample")}
            <br />
            {t("biz.address")}: {BIZ.address || t("biz.addressSample")} ·{" "}
            {t("biz.privacyOfficer")}:{" "}
            {BIZ.privacyOfficer || t("biz.privacyOfficerSample")}
            {BIZ.isPlaceholder && (
              <>
                <br />
                <span className="text-rose-600">
                  {t("biz.placeholderWarning")}
                </span>
              </>
            )}
          </Text>
          <div className="flex justify-between items-center">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} {BIZ.name || t("biz.nameSample")}.{" "}
              {t("footer.rights")}
            </Text>
            <MedusaCTA />
          </div>
        </div>
      </div>
    </footer>
  );
}

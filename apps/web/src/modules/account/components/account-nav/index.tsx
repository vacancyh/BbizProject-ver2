"use client"

import { useT } from "@lib/i18n/client"
import { ArrowRightOnRectangle, CurrencyDollar, Heart, ShieldCheck, Star, Tag } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import User from "@modules/common/icons/user"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const t = useT()
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div>
      <div className="small:hidden" data-testid="mobile-account-nav">
        {route !== `/${countryCode}/account` ? (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-x-2 text-small-regular py-2"
            data-testid="account-main-link"
          >
            <>
              <ChevronDown className="transform rotate-90" />
              <span>{t("nav.account")}</span>
            </>
          </LocalizedClientLink>
        ) : (
          <>
            <div className="text-xl-semi mb-4 px-8">
              {t("account.greeting", { name: customer?.first_name ?? "" })}
            </div>
            <div className="text-base-regular">
              <ul>
                <li>
                  <LocalizedClientLink
                    href="/account/profile"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="profile-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <User size={20} />
                        <span>{t("account.navProfile")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/addresses"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="addresses-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <MapPin size={20} />
                        <span>{t("account.navAddresses")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/orders"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="orders-link"
                  >
                    <div className="flex items-center gap-x-2">
                      <Package size={20} />
                      <span>{t("account.orders")}</span>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/points"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="points-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <CurrencyDollar />
                        <span>{t("account.points")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/membership"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="membership-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <Star />
                        <span>{t("account.membership")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/wishlist"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="wishlist-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <Heart />
                        <span>{t("nav.wishlist")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/coupons"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="coupons-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <Tag />
                        <span>{t("account.navCoupons")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/consents"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8"
                    data-testid="consents-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <ShieldCheck />
                        <span>{t("account.navConsents")}</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex items-center justify-between py-4 border-b border-gray-200 px-8 w-full"
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <div className="flex items-center gap-x-2">
                      <ArrowRightOnRectangle />
                      <span>{t("nav.logout")}</span>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
      <div className="hidden small:block" data-testid="account-nav">
        <div>
          <div className="pb-4">
            <h3 className="text-base-semi">{t("nav.account")}</h3>
          </div>
          <div className="text-base-regular">
            <ul className="flex mb-0 justify-start items-start flex-col gap-y-4">
              <li>
                <AccountNavLink
                  href="/account"
                  route={route!}
                  data-testid="overview-link"
                >
                  {t("account.overview")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/profile"
                  route={route!}
                  data-testid="profile-link"
                >
                  {t("account.navProfile")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/addresses"
                  route={route!}
                  data-testid="addresses-link"
                >
                  {t("account.navAddresses")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/orders"
                  route={route!}
                  data-testid="orders-link"
                >
                  {t("account.orders")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/points"
                  route={route!}
                  data-testid="points-link"
                >
                  {t("account.points")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/membership"
                  route={route!}
                  data-testid="membership-link"
                >
                  {t("account.membership")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/wishlist"
                  route={route!}
                  data-testid="wishlist-link"
                >
                  {t("nav.wishlist")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/coupons"
                  route={route!}
                  data-testid="coupons-link"
                >
                  {t("account.navCoupons")}
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/consents"
                  route={route!}
                  data-testid="consents-link"
                >
                  {t("account.navConsents")}
                </AccountNavLink>
              </li>
              <li className="text-grey-700">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  {t("nav.logout")}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  "data-testid"?: string
}

const AccountNavLink = ({
  href,
  route,
  children,
  "data-testid": dataTestId,
}: AccountNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()

  const active = route.split(countryCode)[1] === href
  return (
    <LocalizedClientLink
      href={href}
      className={clx("text-ui-fg-subtle hover:text-ui-fg-base", {
        "text-ui-fg-base font-semibold": active,
      })}
      data-testid={dataTestId}
    >
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav

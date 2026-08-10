"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment } from "react"
import CountrySelect from "../country-select"


const SideMenuItems: { label: string; href: string; testid: string }[] = [
  { label: "홈", href: "/", testid: "home-link" },
  { label: "스토어", href: "/store", testid: "store-link" },
  { label: "내 계정", href: "/account", testid: "account-link" },
  { label: "장바구니", href: "/cart", testid: "cart-link" },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories?: HttpTypes.StoreProductCategory[]
}

const SideMenu = ({
  regions,
  categories = [],
}: SideMenuProps) => {
  const countryToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center transition-all ease-out duration-200 focus:outline-none hover:text-ui-fg-base"
                >
                  메뉴
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="flex flex-col absolute w-full pr-4 sm:pr-0 sm:w-1/3 2xl:w-1/4 sm:min-w-min h-[calc(100vh-1rem)] z-[51] inset-x-0 text-sm text-ui-fg-on-color m-2 backdrop-blur-2xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-[rgba(3,7,18,0.5)] rounded-rounded justify-between p-6"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button data-testid="close-menu-button" onClick={close}>
                        <XMark />
                      </button>
                    </div>
                    <ul className="flex flex-col gap-6 items-start justify-start">
                      {SideMenuItems.map((item) => {
                        return (
                          <li key={item.href}>
                            <LocalizedClientLink
                              href={item.href}
                              className="text-3xl leading-10 hover:text-ui-fg-disabled"
                              onClick={close}
                              data-testid={item.testid}
                            >
                              {item.label}
                            </LocalizedClientLink>
                          </li>
                        )
                      })}
                    </ul>
                    {categories.length > 0 && (
                      <div className="flex flex-col gap-y-3">
                        <span className="text-sm uppercase tracking-wide text-ui-fg-on-color/60">
                          카테고리
                        </span>
                        <ul className="flex flex-col gap-y-2">
                          {categories.map((c) => (
                            <li key={c.id}>
                              <LocalizedClientLink
                                href={`/categories/${c.handle}`}
                                className="text-lg leading-7 hover:text-ui-fg-disabled"
                                onClick={close}
                                data-testid="category-link"
                              >
                                {/* 표시명만 시드 테스트 표식 정리 (handle/데이터는 admin 소관) */}
                                {c.name.replace(/\s*\(kr-test\)\s*$/i, "")}
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* 언어 선택은 헤더로 옮겼다(2026-08-10) — 사이드메뉴 안에 있어 찾기 어려웠다.
                        → modules/layout/components/language-switcher */}
                    <div className="flex flex-col gap-y-6">
                      <div
                        className="flex justify-between"
                        onMouseEnter={countryToggleState.open}
                        onMouseLeave={countryToggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            countryToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="flex justify-between txt-compact-small">
                        © {new Date().getFullYear()} 쇼핑몰. All rights reserved.
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu

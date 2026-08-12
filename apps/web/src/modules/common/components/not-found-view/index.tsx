import { getT } from "@lib/i18n"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * 404 공용 화면 (2026-08-12 신설)
 *
 * ── 왜 링크를 직접 넣나 ─────────────────────────────────────────────────────
 * Next 는 `notFound()` 로 그려지는 화면에 **상위 레이아웃을 붙여 주지 않는다.**
 * 헤더·푸터가 사라지므로, 고객이 여기서 갈 곳이 없어진다.
 * 그래서 이 화면 안에 최소한의 이동 경로를 직접 넣는다.
 *
 * ── 왜 세그먼트마다 not-found.tsx 가 필요한가 ───────────────────────────────
 * Next 는 `notFound()` 에 대해 **그 세그먼트의** not-found.tsx 만 찾는다.
 * 상위(`(main)/not-found.tsx`)로 올라가지 않는다 — 없으면 프레임워크 기본
 * "404" 맨 화면이 나간다(2026-08-12 실측: 없는 상품 주소가 그랬다).
 * 그래서 `notFound()` 를 부르는 세그먼트마다 얇은 not-found.tsx 를 두고
 * 이 컴포넌트를 그린다.
 */
export default async function NotFoundView() {
  const t = await getT()

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/store", label: t("store.title") },
    { href: "/customer-service", label: t("nav.customerService") },
  ]

  return (
    <div
      className="content-container flex flex-col items-center justify-center gap-6 py-32 text-center"
      data-testid="not-found-view"
    >
      <h1 className="text-2xl-semi text-ui-fg-base">{t("error.notFoundTitle")}</h1>
      <p className="text-base-regular text-ui-fg-subtle max-w-md">
        {t("error.notFoundBody")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {links.map((l, i) => (
          <LocalizedClientLink
            key={l.href}
            href={l.href}
            className={
              "h-11 rounded-rounded px-6 leading-[2.75rem] text-base-regular hover:bg-ui-bg-subtle " +
              (i === 0
                ? "border border-ui-border-interactive"
                : "border border-ui-border-base")
            }
          >
            {l.label}
          </LocalizedClientLink>
        ))}
      </div>
    </div>
  )
}

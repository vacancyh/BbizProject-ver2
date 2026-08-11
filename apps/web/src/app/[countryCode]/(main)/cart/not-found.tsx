import { getT } from "@lib/i18n"
import { Metadata } from "next"

import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "Cart not found",
}

export default async function NotFound() {
  const t = await getT()
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("error.notFoundTitle")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("cart.notFoundBody")}
      </p>
      <InteractiveLink href="/">{t("error.goHome")}</InteractiveLink>
    </div>
  )
}

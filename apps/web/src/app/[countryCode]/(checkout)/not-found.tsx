import { getT } from "@lib/i18n"
import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Page not found",
}

export default async function NotFound() {
  const t = await getT()
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("error.notFoundTitle")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("error.notFoundBody")}
      </p>
      <InteractiveLink href="/">{t("error.goHome")}</InteractiveLink>
    </div>
  )
}

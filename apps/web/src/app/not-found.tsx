import { ArrowUpRightMini } from "@medusajs/icons"
import { getT } from "@lib/i18n"
import { Text } from "@modules/common/components/ui"
import { Metadata } from "next"
import Link from "next/link"

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
      <Link className="flex gap-x-1 items-center group" href="/">
        <Text className="text-ui-fg-interactive">{t("error.goHome")}</Text>
        <ArrowUpRightMini
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}

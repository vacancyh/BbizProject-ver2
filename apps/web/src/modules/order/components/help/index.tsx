import { getT } from "@lib/i18n"
import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = async () => {
  const t = await getT()
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">{t("order.helpTitle")}</Heading>
      <div className="text-base-regular my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <LocalizedClientLink href="/customer-service">
              {t("order.helpContact")}
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/customer-service">
              {t("order.helpReturn")}
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help

import { Metadata } from "next"
import { getT } from "@lib/i18n"

import OrderLookupForm from "@modules/order/components/order-lookup-form"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("lookup.title"), description: t("lookup.metaDescription") }
}

export default async function OrderLookupPage() {
  const t = await getT()
  return (
    <div className="content-container py-12 small:py-20 max-w-2xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-2">
        {t("lookup.title")}
      </h1>
      <p className="text-base-regular text-ui-fg-subtle mb-10">
        {t("lookup.intro")}
      </p>
      <OrderLookupForm />
    </div>
  )
}

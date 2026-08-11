import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { getT } from "@lib/i18n"
import { notFound } from "next/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("cart.title"), description: t("cart.metaDescription") }
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return <CartTemplate cart={cart} customer={customer} />
}

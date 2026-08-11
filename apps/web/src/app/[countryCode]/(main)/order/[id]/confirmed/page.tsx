import { getT } from "@lib/i18n"
import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("page.orderConfirmed"), description: t("page.orderConfirmedMeta") }
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <OrderCompletedTemplate order={order} />
}

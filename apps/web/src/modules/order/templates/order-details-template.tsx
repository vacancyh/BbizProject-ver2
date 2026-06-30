"use client"

import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import OrderRequest from "@modules/order/components/order-request"
import ConfirmPurchase from "@modules/order/components/confirm-purchase"
import TaxReceipt from "@modules/order/components/tax-receipt"
import ShippingDetails from "@modules/order/components/shipping-details"
import ShippingTracking from "@modules/order/components/shipping-tracking"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  return (
    <div className="flex flex-col justify-center gap-y-4">
      <div className="flex gap-2 justify-between items-center">
        <h1 className="text-2xl-semi">주문 상세</h1>
        <LocalizedClientLink
          href="/account/orders"
          className="flex gap-2 items-center text-ui-fg-subtle hover:text-ui-fg-base"
          data-testid="back-to-overview-button"
        >
          <XMark /> 주문 내역으로
        </LocalizedClientLink>
      </div>
      <div
        className="flex flex-col gap-4 h-full bg-white w-full"
        data-testid="order-details-container"
      >
        <OrderDetails order={order} showStatus />
        <Items order={order} />
        <ShippingDetails order={order} />
        <ShippingTracking order={order} />
        <OrderSummary order={order} />
        <ConfirmPurchase
          orderId={order.id}
          fulfillmentStatus={order.fulfillment_status}
        />
        <OrderRequest orderId={order.id} />
        <TaxReceipt orderId={order.id} />
        <Help />
      </div>
    </div>
  )
}

export default OrderDetailsTemplate

"use client"

import { useT } from "@lib/i18n/client"
import { Button, clx } from "@modules/common/components/ui"
import {
  requestOrderAction,
  type OrderRequestType,
} from "@lib/data/order-requests"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type { MessageKey } from "@lib/i18n/messages"

const TYPES: { value: OrderRequestType; labelKey: MessageKey }[] = [
  { value: "cancel", labelKey: "request.cancel" },
  { value: "return", labelKey: "request.return" },
  { value: "exchange", labelKey: "request.exchange" },
]

/**
 * 신청 사유.
 *
 * `value` 는 **백엔드로 보내는 한국어 원문**이다 — 관리자 화면과 기존 신청 이력이
 * 이 문자열을 그대로 쓰고 있어서 바꾸면 과거 데이터와 어긋난다.
 * 화면에 보이는 글자만 `labelKey` 로 번역한다.
 */
const REASONS: Record<
  OrderRequestType,
  { value: string; labelKey: MessageKey }[]
> = {
  cancel: [
    { value: "단순 변심", labelKey: "request.reason.changeOfMind" },
    { value: "주문 실수", labelKey: "request.reason.orderMistake" },
    { value: "배송 지연", labelKey: "request.reason.shippingDelay" },
    { value: "기타", labelKey: "request.reason.etc" },
  ],
  return: [
    { value: "단순 변심", labelKey: "request.reason.changeOfMind" },
    { value: "상품 불량/파손", labelKey: "request.reason.defect" },
    { value: "오배송", labelKey: "request.reason.wrongItem" },
    { value: "사이즈/색상 불만", labelKey: "request.reason.sizeColor" },
    { value: "기타", labelKey: "request.reason.etc" },
  ],
  exchange: [
    { value: "사이즈 변경", labelKey: "request.reason.sizeChange" },
    { value: "색상 변경", labelKey: "request.reason.colorChange" },
    { value: "상품 불량/파손", labelKey: "request.reason.defect" },
    { value: "기타", labelKey: "request.reason.etc" },
  ],
}

const OrderRequest = ({ orderId }: { orderId: string }) => {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<OrderRequestType>("cancel")
  const [reason, setReason] = useState(REASONS.cancel[0].value)
  const [comment, setComment] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 인자 이름을 t 로 두면 번역 함수 t 를 가린다(2026-08-10 전환 중 발견)
  const onTypeChange = (next: OrderRequestType) => {
    setType(next)
    setReason(REASONS[next][0].value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await requestOrderAction(orderId, type, reason, comment.trim())
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(res.error ?? t("request.failed"))
      }
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-5 text-center">
        <p className="text-base-regular text-ui-fg-base">
          {t("request.done")}
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-6">
        <Button
          variant="secondary"
          className="rounded-none"
          onClick={() => setOpen(true)}
          data-testid="open-order-request"
        >
          {t("request.open")}
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="order-request-form"
    >
      <h3 className="text-large-semi">{t("request.title")}</h3>

      {/* 유형 */}
      <div className="flex gap-x-2">
        {TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onTypeChange(opt.value)}
            className={clx(
              "flex-1 h-10 border text-small-regular transition-colors",
              type === opt.value
                ? "border-ui-fg-base text-ui-fg-base font-medium"
                : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-muted"
            )}
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      {/* 사유 */}
      <div className="flex flex-col gap-y-1">
        <label className="text-small-regular text-ui-fg-subtle">{t("request.reason")}</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="request-reason"
        >
          {REASONS[type].map((r) => (
            <option key={r.value} value={r.value}>
              {t(r.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("request.detailPlaceholder")}
        rows={3}
        className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base resize-none"
        data-testid="request-comment"
      />

      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}

      <div className="flex gap-x-2 justify-end">
        <Button
          type="reset"
          variant="secondary"
          className="rounded-none"
          onClick={() => setOpen(false)}
        >
          {t("common.close")}
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-order-request"
        >
          {t("request.submit")}
        </Button>
      </div>
    </form>
  )
}

export default OrderRequest

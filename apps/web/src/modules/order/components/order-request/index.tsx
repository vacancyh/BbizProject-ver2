"use client"

import { Button, clx } from "@modules/common/components/ui"
import {
  requestOrderAction,
  type OrderRequestType,
} from "@lib/data/order-requests"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const TYPES: { value: OrderRequestType; label: string }[] = [
  { value: "cancel", label: "취소" },
  { value: "return", label: "반품" },
  { value: "exchange", label: "교환" },
]

const REASONS: Record<OrderRequestType, string[]> = {
  cancel: ["단순 변심", "주문 실수", "배송 지연", "기타"],
  return: ["단순 변심", "상품 불량/파손", "오배송", "사이즈/색상 불만", "기타"],
  exchange: ["사이즈 변경", "색상 변경", "상품 불량/파손", "기타"],
}

const OrderRequest = ({ orderId }: { orderId: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<OrderRequestType>("cancel")
  const [reason, setReason] = useState(REASONS.cancel[0])
  const [comment, setComment] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onTypeChange = (t: OrderRequestType) => {
    setType(t)
    setReason(REASONS[t][0])
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
        setError(res.error ?? "신청 실패")
      }
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-5 text-center">
        <p className="text-base-regular text-ui-fg-base">
          신청이 접수되었습니다. 운영자 확인 후 처리되며, 진행 상황은 주문 상태로
          안내드립니다.
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
          취소·반품·교환 신청
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
      <h3 className="text-large-semi">취소·반품·교환 신청</h3>

      {/* 유형 */}
      <div className="flex gap-x-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTypeChange(t.value)}
            className={clx(
              "flex-1 h-10 border text-small-regular transition-colors",
              type === t.value
                ? "border-ui-fg-base text-ui-fg-base font-medium"
                : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 사유 */}
      <div className="flex flex-col gap-y-1">
        <label className="text-small-regular text-ui-fg-subtle">사유</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="request-reason"
        >
          {REASONS[type].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="상세 내용 (선택)"
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
          닫기
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-order-request"
        >
          신청
        </Button>
      </div>
    </form>
  )
}

export default OrderRequest

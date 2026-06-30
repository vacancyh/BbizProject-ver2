"use client"

import { Button, clx } from "@modules/common/components/ui"
import { requestTaxReceipt } from "@lib/data/order-requests"
import { useState, useTransition } from "react"

const TaxReceipt = ({ orderId }: { orderId: string }) => {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"cash_receipt" | "tax_invoice">("cash_receipt")
  const [identifier, setIdentifier] = useState("")
  const [bizNo, setBizNo] = useState("")
  const [company, setCompany] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload =
        type === "cash_receipt"
          ? { identifier: identifier.trim() }
          : { biz_no: bizNo.trim(), company_name: company.trim() }
      const res = await requestTaxReceipt(orderId, type, payload)
      if (res.ok) setDone(true)
      else setError(res.error ?? "신청 실패")
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-4 text-center">
        <p className="text-base-regular text-ui-fg-base">
          {type === "cash_receipt" ? "현금영수증" : "세금계산서"} 발급 신청이
          접수되었습니다. 운영자 확인 후 발급됩니다.
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
          data-testid="open-tax-receipt"
        >
          현금영수증·세금계산서 신청
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="tax-receipt-form"
    >
      <h3 className="text-large-semi">현금영수증·세금계산서 신청</h3>
      <div className="flex gap-x-2">
        {([
          { v: "cash_receipt", l: "현금영수증" },
          { v: "tax_invoice", l: "세금계산서" },
        ] as const).map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setType(t.v)}
            className={clx(
              "flex-1 h-10 border text-small-regular transition-colors",
              type === t.v
                ? "border-ui-fg-base text-ui-fg-base font-medium"
                : "border-ui-border-base text-ui-fg-subtle hover:border-ui-fg-muted"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {type === "cash_receipt" ? (
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="휴대폰 번호 또는 현금영수증 카드번호"
          className="border border-ui-border-base rounded-none bg-transparent px-3 h-11 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="cash-receipt-id"
        />
      ) : (
        <>
          <input
            type="text"
            value={bizNo}
            onChange={(e) => setBizNo(e.target.value)}
            placeholder="사업자등록번호 (000-00-00000)"
            className="border border-ui-border-base rounded-none bg-transparent px-3 h-11 text-base-regular outline-none focus:border-ui-fg-base"
            data-testid="tax-biz-no"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="상호명 (선택)"
            className="border border-ui-border-base rounded-none bg-transparent px-3 h-11 text-base-regular outline-none focus:border-ui-fg-base"
            data-testid="tax-company"
          />
        </>
      )}

      {error && <p className="text-small-regular text-ui-tag-red-text">{error}</p>}

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
          data-testid="submit-tax-receipt"
        >
          신청
        </Button>
      </div>
    </form>
  )
}

export default TaxReceipt

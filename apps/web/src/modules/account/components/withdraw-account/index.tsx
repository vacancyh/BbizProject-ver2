"use client"

import { useT } from "@lib/i18n/client"
import { Button } from "@modules/common/components/ui"
import { withdrawAccount } from "@lib/data/customer"
import { useParams } from "next/navigation"
import { useState, useTransition } from "react"

const WithdrawAccount = () => {
  const t = useT()
  const { countryCode } = useParams() as { countryCode: string }
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleWithdraw = () => {
    startTransition(async () => {
      await withdrawAccount(countryCode) // 성공 시 홈으로 redirect
    })
  }

  return (
    <div className="border-t border-gray-200 pt-8 mt-8" data-testid="withdraw-account">
      <h3 className="text-base-semi text-ui-fg-base">{t("withdraw.title")}</h3>
      <p className="text-small-regular text-ui-fg-muted mt-1 mb-3">
        {t("withdraw.body")}
      </p>
      {!confirming ? (
        <Button
          variant="secondary"
          className="rounded-none w-fit"
          onClick={() => setConfirming(true)}
          data-testid="open-withdraw"
        >
          {t("withdraw.title")}
        </Button>
      ) : (
        <div className="flex items-center gap-x-2">
          <Button
            variant="secondary"
            className="rounded-none"
            onClick={() => setConfirming(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-none bg-ui-tag-red-text"
            onClick={handleWithdraw}
            isLoading={isPending}
            data-testid="confirm-withdraw"
          >
            {t("withdraw.confirm")}
          </Button>
        </div>
      )}
    </div>
  )
}

export default WithdrawAccount

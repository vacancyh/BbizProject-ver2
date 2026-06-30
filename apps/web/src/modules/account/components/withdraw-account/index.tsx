"use client"

import { Button } from "@modules/common/components/ui"
import { withdrawAccount } from "@lib/data/customer"
import { useParams } from "next/navigation"
import { useState, useTransition } from "react"

const WithdrawAccount = () => {
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
      <h3 className="text-base-semi text-ui-fg-base">회원 탈퇴</h3>
      <p className="text-small-regular text-ui-fg-muted mt-1 mb-3">
        탈퇴 시 계정 정보가 삭제되며 복구할 수 없습니다. 주문 내역은 관계
        법령에 따라 일정 기간 보존됩니다.
      </p>
      {!confirming ? (
        <Button
          variant="secondary"
          className="rounded-none w-fit"
          onClick={() => setConfirming(true)}
          data-testid="open-withdraw"
        >
          회원 탈퇴
        </Button>
      ) : (
        <div className="flex items-center gap-x-2">
          <Button
            variant="secondary"
            className="rounded-none"
            onClick={() => setConfirming(false)}
          >
            취소
          </Button>
          <Button
            className="rounded-none bg-ui-tag-red-text"
            onClick={handleWithdraw}
            isLoading={isPending}
            data-testid="confirm-withdraw"
          >
            탈퇴 확인
          </Button>
        </div>
      )}
    </div>
  )
}

export default WithdrawAccount

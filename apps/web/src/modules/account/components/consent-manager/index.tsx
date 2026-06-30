"use client"

import { clx } from "@modules/common/components/ui"
import {
  setConsent,
  type ConsentChannel,
  type ConsentState,
} from "@lib/data/consent"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const CONSENT_LABELS: Record<
  ConsentChannel,
  { title: string; desc: string }
> = {
  marketing: {
    title: "마케팅 정보 수신 동의 (선택)",
    desc: "할인·이벤트·신상품 소식을 받아보실 수 있습니다.",
  },
  sms: {
    title: "SMS 수신 동의 (선택)",
    desc: "주문/배송 외 광고성 문자 수신에 동의합니다.",
  },
  email: {
    title: "이메일 수신 동의 (선택)",
    desc: "주문/배송 외 광고성 이메일 수신에 동의합니다.",
  },
}

const CHANNELS: ConsentChannel[] = ["marketing", "sms", "email"]

const Toggle = ({
  on,
  onClick,
  disabled,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    disabled={disabled}
    className={clx(
      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
      on ? "bg-ui-fg-base" : "bg-ui-border-base"
    )}
  >
    <span
      className={clx(
        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
        on ? "translate-x-5" : "translate-x-0.5"
      )}
    />
  </button>
)

const ConsentManager = ({ initial }: { initial: ConsentState }) => {
  const router = useRouter()
  const [state, setState] = useState<ConsentState>(initial)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (channel: ConsentChannel) => {
    const next = !state[channel]
    setState((prev) => ({ ...prev, [channel]: next })) // 낙관적
    startTransition(async () => {
      await setConsent(channel, next)
      router.refresh()
    })
  }

  return (
    <ul className="flex flex-col divide-y divide-ui-border-base" data-testid="consent-manager">
      {CHANNELS.map((ch) => (
        <li key={ch} className="flex items-center justify-between gap-x-4 py-5">
          <div className="flex flex-col gap-y-1">
            <span className="text-base-regular text-ui-fg-base">
              {CONSENT_LABELS[ch].title}
            </span>
            <span className="text-small-regular text-ui-fg-muted">
              {CONSENT_LABELS[ch].desc}
            </span>
          </div>
          <Toggle
            on={state[ch]}
            onClick={() => handleToggle(ch)}
            disabled={isPending}
          />
        </li>
      ))}
    </ul>
  )
}

export default ConsentManager

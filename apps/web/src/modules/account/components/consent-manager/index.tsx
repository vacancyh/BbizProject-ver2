"use client"

import { clx } from "@modules/common/components/ui"
import {
  setConsent,
  type ConsentChannel,
  type ConsentState,
} from "@lib/data/consent"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useT } from "@lib/i18n/client"
import type { MessageKey } from "@lib/i18n/messages"

/** 채널별 문구 — 값은 **번역 키**다(문구 자체를 들고 있으면 영어 화면에도 한국어가 나간다). */
const CONSENT_LABELS: Record<
  ConsentChannel,
  { titleKey: MessageKey; descKey: MessageKey }
> = {
  marketing: {
    titleKey: "consent.marketingTitle",
    descKey: "consent.marketingDesc",
  },
  sms: {
    titleKey: "consent.smsTitle",
    descKey: "consent.smsDesc",
  },
  email: {
    titleKey: "consent.emailTitle",
    descKey: "consent.emailDesc",
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
  const t = useT()
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
              {t(CONSENT_LABELS[ch].titleKey)}
            </span>
            <span className="text-small-regular text-ui-fg-muted">
              {t(CONSENT_LABELS[ch].descKey)}
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

"use client"

import { useT } from "@lib/i18n/client"
import { useEffect, useState } from "react"

const pad = (n: number) => String(n).padStart(2, "0")

const Countdown = ({ endsAt }: { endsAt: string }) => {
  const t = useT()
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const end = new Date(endsAt).getTime()
    const tick = () => setRemaining(Math.max(0, end - Date.now()))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  if (remaining === null) {
    return null
  }

  const totalSec = Math.floor(remaining / 1000)
  const d = Math.floor(totalSec / 86400)
  const hh = Math.floor((totalSec % 86400) / 3600)
  const mm = Math.floor((totalSec % 3600) / 60)
  const ss = totalSec % 60

  if (remaining === 0) {
    return <span className="text-small-regular text-ui-fg-muted">{t("home.countdownEnded")}</span>
  }

  return (
    <span
      className="text-small-regular tabular-nums text-ui-fg-base"
      data-testid="timesale-countdown"
      aria-label={t("home.countdownAria")}
    >
      {d > 0 ? t("home.countdownDays", { d }) : ""}
      {pad(hh)}:{pad(mm)}:{pad(ss)}
      {t("home.countdownLeft")}
    </span>
  )
}

export default Countdown

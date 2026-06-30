"use client"

import { useEffect, useState } from "react"

const pad = (n: number) => String(n).padStart(2, "0")

const Countdown = ({ endsAt }: { endsAt: string }) => {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const end = new Date(endsAt).getTime()
    const tick = () => setRemaining(Math.max(0, end - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
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
    return <span className="text-small-regular text-ui-fg-muted">종료됨</span>
  }

  return (
    <span
      className="text-small-regular tabular-nums text-ui-fg-base"
      data-testid="timesale-countdown"
      aria-label="남은 시간"
    >
      {d > 0 ? `${d}일 ` : ""}
      {pad(hh)}:{pad(mm)}:{pad(ss)} 남음
    </span>
  )
}

export default Countdown

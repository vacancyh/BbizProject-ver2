// KPI 카드 — 대시보드 핵심 지표. 값 + 증감률(▲/▼) + 보조설명, attn(주의) 강조 테두리.
// ZIP 대시보드의 KPI 카드 구성을 Medusa UI 토큰으로 정합 이식했습니다.
import { Container, Heading, Text, clx } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { pct } from "../lib/admin-format"

export type KpiDir = "up" | "down"

type Props = {
  label: string
  value: string
  delta?: number
  dir?: KpiDir
  sub?: string
  /** 처리 필요(주의) 지표 강조 */
  attn?: boolean
  /** 클릭 시 이동 경로 */
  to?: string
}

export const AdminKpiCard = ({ label, value, delta, dir, sub, attn, to }: Props) => {
  const inner = (
    <Container
      className={clx(
        "flex flex-col gap-y-2 p-4 transition-fg",
        to && "hover:bg-ui-bg-base-hover",
        attn && "border-ui-tag-orange-border bg-ui-tag-orange-bg"
      )}
    >
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Heading level="h2">{value}</Heading>
      <div className="flex items-center gap-x-2">
        {delta != null && dir && (
          <span
            className={clx(
              "text-xs font-semibold",
              dir === "up" ? "text-ui-fg-interactive" : "text-ui-tag-red-text"
            )}
          >
            {dir === "up" ? "▲" : "▼"} {pct(Math.abs(delta))}
          </span>
        )}
        {sub && (
          <Text size="xsmall" className="text-ui-fg-muted">
            {sub}
          </Text>
        )}
      </div>
    </Container>
  )
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

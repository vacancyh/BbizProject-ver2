// 상태 배지 — ZIP 의 tone(primary/info/neutral/warning/danger/success) 을 Medusa Badge 색으로 매핑.
// 주문/배송/정산 상태 라벨을 화면 전체에서 일관된 색으로 표기하기 위한 공용 컴포넌트.
import { Badge } from "@medusajs/ui"

export type StatusTone =
  | "primary"
  | "info"
  | "neutral"
  | "warning"
  | "danger"
  | "success"

type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple"

const TONE_TO_COLOR: Record<StatusTone, BadgeColor> = {
  primary: "blue",
  info: "blue",
  neutral: "grey",
  warning: "orange",
  danger: "red",
  success: "green",
}

type Props = {
  tone: StatusTone
  children: React.ReactNode
  size?: "2xsmall" | "xsmall" | "small" | "base" | "large"
}

export const AdminStatusBadge = ({ tone, children, size = "2xsmall" }: Props) => (
  <Badge color={TONE_TO_COLOR[tone]} size={size}>
    {children}
  </Badge>
)

// 차트 컴포넌트 배럴. 화면에서는 이 경로로 한 번에 import 합니다.
export { LineChart } from "./line-chart"
export type { LineSeries } from "./line-chart"
export { BarChart } from "./bar-chart"
export type { BarItem } from "./bar-chart"
export { DonutChart } from "./donut-chart"
export type { DonutSegment } from "./donut-chart"
export { Sparkline } from "./sparkline"

/** 차트 공용 팔레트 (ZIP --c1..c4 + 상태색 정합) */
export const CHART_PALETTE = {
  primary: "#2563EB",
  info: "#0EA5E9",
  neutral: "#94A3B8",
  dark: "#1E293B",
  warning: "#D97706",
  danger: "#DC2626",
  success: "#16A34A",
} as const

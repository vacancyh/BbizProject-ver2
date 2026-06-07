// 스파크라인 (소형 추세선). 무의존성 SVG. ZIP admin-charts.js → React 정합 이식.
import { Point, smoothPath } from "./chart-math"

type Props = {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export const Sparkline = ({ data, color = "#2563EB", width = 90, height = 30 }: Props) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const rng = max - min || 1
  const pts: Point[] = data.map((v, i) => [
    +((width * i) / (data.length - 1)).toFixed(1),
    +(height - 2 - ((v - min) / rng) * (height - 4)).toFixed(1),
  ])
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }}>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  )
}

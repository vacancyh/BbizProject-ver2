// 막대 차트 (카테고리형). 무의존성 SVG. ZIP admin-charts.js → React 정합 이식.
import { fmt } from "../../lib/admin-format"
import { niceStep } from "./chart-math"

export type BarItem = { label: string; value: number; color?: string }

type Props = {
  items: BarItem[]
  yfmt?: (v: number) => string
  className?: string
}

const W = 720
const H = 250
const PL = 46
const PR = 16
const PT = 16
const PB = 34

export const BarChart = ({ items, yfmt, className }: Props) => {
  const iw = W - PL - PR
  const ih = H - PT - PB

  let max = 0
  items.forEach((it) => { if (it.value > max) max = it.value })
  const { max: ymax, step } = niceStep(max * 1.15 || 1, 4)

  const y = (v: number) => PT + ih - (v / ymax) * ih
  const band = iw / items.length
  const bw = Math.min(54, band * 0.5)

  const gridLines: number[] = []
  for (let v = 0; v <= ymax + 1; v += step) gridLines.push(v)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: "block" }}
    >
      {gridLines.map((v, i) => {
        const yy = y(v)
        return (
          <g key={`g${i}`}>
            <line x1={PL} y1={yy} x2={W - PR} y2={yy} stroke="#EEF1F5" />
            <text x={PL - 9} y={yy + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">
              {yfmt ? yfmt(v) : fmt(v)}
            </text>
          </g>
        )
      })}

      {items.map((it, i) => {
        const cx = PL + band * i + band / 2
        const h = (it.value / ymax) * ih
        const yy = PT + ih - h
        return (
          <g key={`b${i}`}>
            <rect
              x={cx - bw / 2}
              y={yy}
              width={bw}
              height={Math.max(h, 0)}
              rx="5"
              fill={it.color || "#2563EB"}
            />
            <text x={cx} y={yy - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">
              {fmt(it.value)}
            </text>
            <text x={cx} y={H - 12} textAnchor="middle" fontSize="11" fill="#6B7280">
              {it.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

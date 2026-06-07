// 라인 차트 (1~2 시리즈, 영역 그라데이션). 무의존성 SVG. ZIP admin-charts.js → React 정합 이식.
import { useId } from "react"
import { fmt } from "../../lib/admin-format"
import { Point, niceStep, smoothPath } from "./chart-math"

export type LineSeries = { name: string; color: string; data: number[] }

type Props = {
  labels: string[]
  series: LineSeries[]
  /** y축 라벨 포맷터 (기본: 천단위 콤마) */
  yfmt?: (v: number) => string
  className?: string
}

const W = 720
const H = 250
const PL = 46
const PR = 16
const PT = 16
const PB = 34

export const LineChart = ({ labels, series, yfmt, className }: Props) => {
  const rawUid = useId()
  const uid = `lc${rawUid.replace(/[:]/g, "")}`
  const iw = W - PL - PR
  const ih = H - PT - PB

  let max = 0
  series.forEach((s) => s.data.forEach((v) => { if (v > max) max = v }))
  max = max * 1.15 || 1
  const { max: ymax, step } = niceStep(max, 4)

  const x = (i: number) =>
    PL + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1))
  const y = (v: number) => PT + ih - (v / ymax) * ih

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
      {/* 가로 그리드 + y축 라벨 */}
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

      {/* 영역 그라데이션 (첫 시리즈) */}
      {series[0] && (
        <>
          <defs>
            <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={series[0].color} stopOpacity="0.16" />
              <stop offset="1" stopColor={series[0].color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${smoothPath(series[0].data.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)] as Point))} L ${x(labels.length - 1)} ${PT + ih} L ${x(0)} ${PT + ih} Z`}
            fill={`url(#${uid})`}
          />
        </>
      )}

      {/* 라인 + 마지막 점 */}
      {series.map((s, si) => {
        const pts: Point[] = s.data.map((v, i) => [+x(i).toFixed(1), +y(v).toFixed(1)])
        return (
          <g key={`s${si}`}>
            <path d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" />
            {pts.map((p, i) =>
              i === pts.length - 1 || labels.length <= 12 ? (
                <circle
                  key={`d${i}`}
                  cx={p[0]}
                  cy={p[1]}
                  r={i === pts.length - 1 ? 3.5 : 2.6}
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth="2"
                />
              ) : null
            )}
          </g>
        )
      })}

      {/* x축 라벨 */}
      {labels.map((l, i) => (
        <text key={`x${i}`} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="#9CA3AF">
          {l}
        </text>
      ))}
    </svg>
  )
}

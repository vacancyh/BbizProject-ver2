// 도넛 차트 (구성 비율). 무의존성 SVG. ZIP admin-charts.js → React 정합 이식.

export type DonutSegment = { label: string; value: number; color: string }

type Props = {
  segments: DonutSegment[]
  size?: number
  /** stroke width */
  sw?: number
  centerTop?: string
  centerSub?: string
}

export const DonutChart = ({ segments, size = 180, sw = 22, centerTop, centerSub }: Props) => {
  const r = size / 2 - 14
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  const total = segments.reduce((a, s) => a + s.value, 0) || 1

  let off = 0
  const arcs = segments.map((s, i) => {
    const len = (s.value / total) * C
    const arc = (
      <circle
        key={`arc${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={sw}
        strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
        strokeDashoffset={(-off).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
        strokeLinecap="butt"
      />
    )
    off += len
    return arc
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ flex: "0 0 auto" }}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F3F6" strokeWidth={sw} />
      {arcs}
      {centerTop != null && (
        <>
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="#111827">
            {centerTop}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#9CA3AF">
            {centerSub || ""}
          </text>
        </>
      )}
    </svg>
  )
}

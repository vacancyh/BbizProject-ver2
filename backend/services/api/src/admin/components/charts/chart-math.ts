// 경량 SVG 차트 공용 수학 함수. (ZIP admin-charts.js 의 smoothPath / niceStep 정합 이식)
// 외부 차트 라이브러리 없이 SVG path 를 직접 계산하기 위한 순수 함수 모음입니다.

export type Point = [number, number]

/** Catmull-Rom 기반 부드러운 곡선 path (라인 차트용) */
export function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return ""
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`
  }
  return d
}

/** 축 눈금을 "보기 좋은" 간격(1/2/5/10 배수)으로 정규화 */
export function niceStep(max: number, target: number): { step: number; max: number } {
  const raw = max / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  let step: number
  if (norm < 1.5) step = 1
  else if (norm < 3) step = 2
  else if (norm < 7) step = 5
  else step = 10
  step *= mag
  return { step, max: Math.ceil(max / step) * step }
}

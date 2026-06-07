// 차트 카드 — 제목 + (우측 액션) + 차트 본문 + (범례) 의 표준 카드 레이아웃.
// 대시보드/정산 화면에서 차트를 감싸는 공용 컨테이너입니다.
import { Container, Heading } from "@medusajs/ui"

export type ChartLegend = { label: string; color: string; value?: string }

type Props = {
  title: string
  /** 제목 우측 영역(기간 선택 등) */
  action?: React.ReactNode
  legend?: ChartLegend[]
  children: React.ReactNode
}

export const AdminChartCard = ({ title, action, legend, children }: Props) => (
  <Container className="flex flex-col gap-y-4 p-6">
    <div className="flex items-center justify-between">
      <Heading level="h2">{title}</Heading>
      {action}
    </div>
    <div>{children}</div>
    {legend && legend.length > 0 && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-x-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-ui-fg-subtle text-xs">{l.label}</span>
            {l.value && <span className="text-ui-fg-base text-xs font-semibold">{l.value}</span>}
          </div>
        ))}
      </div>
    )}
  </Container>
)

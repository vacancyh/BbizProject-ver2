// 공용 데이터 테이블 — 컬럼 정의 + 행 데이터로 Medusa Table 을 렌더링하는 재사용 컴포넌트.
// 주문/배송/정산 목록 화면에서 동일한 표 형태를 공유하기 위한 얇은 래퍼입니다.
import { Table, Text } from "@medusajs/ui"

export type Column<T> = {
  key: string
  header: React.ReactNode
  /** 셀 렌더러 (없으면 row[key] 를 그대로 출력) */
  render?: (row: T) => React.ReactNode
  align?: "left" | "right" | "center"
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  emptyText?: string
}

export function AdminDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "표시할 데이터가 없습니다.",
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center px-6 py-16">
        <Text className="text-ui-fg-subtle" size="small">
          {emptyText}
        </Text>
      </div>
    )
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          {columns.map((c) => (
            <Table.HeaderCell key={c.key} className={c.align === "right" ? "text-right" : undefined}>
              {c.header}
            </Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row, i) => (
          <Table.Row
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? "cursor-pointer" : undefined}
          >
            {columns.map((c) => (
              <Table.Cell key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                {c.render ? c.render(row) : String(row[c.key] ?? "")}
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

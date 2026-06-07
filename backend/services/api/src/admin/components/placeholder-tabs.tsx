// 배송/정산 등 "준비중" 영역용 공통 탭형 placeholder 컴포넌트.
// 하위 영역을 탭으로 노출(URL ?tab= 동기화)하며, 추후 각 탭을 실제 라우트/화면으로 분리하기 쉽습니다.
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useSearchParams } from "react-router-dom"

export type TabDef = { key: string; label: string }

type Props = {
  title: string
  description: string
  note: string
  tabs: TabDef[]
}

export const PlaceholderTabs = ({ title, description, note, tabs }: Props) => {
  const [params, setParams] = useSearchParams()
  const active = params.get("tab") || tabs[0].key
  const activeTab = tabs.find((t) => t.key === active) || tabs[0]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">{title}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {description}
          </Text>
        </div>
        <Badge color="orange" size="small">
          준비중
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-4">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="small"
            variant={t.key === active ? "primary" : "secondary"}
            onClick={() =>
              setParams(t.key === tabs[0].key ? {} : { tab: t.key })
            }
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <Heading level="h2">{activeTab.label}</Heading>
        <Text className="text-ui-fg-subtle max-w-md">{note}</Text>
      </div>
    </Container>
  )
}

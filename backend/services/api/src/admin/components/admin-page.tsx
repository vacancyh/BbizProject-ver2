// 반응형/PC 폭 표준 컨테이너 — 화면 타입별로 본문 폭 정책을 분리합니다. (지시서 §10)
// - dashboard / table : 넓은 폭을 그대로 사용(32인치에서도 본문이 가운데 작은 섬처럼 뜨지 않게)
// - form/settings     : 가독성을 위해 max-width 로 제한(가운데 정렬)
import { clx } from "@medusajs/ui"

export type PageVariant = "dashboard" | "table" | "form"

const VARIANT_CLASS: Record<PageVariant, string> = {
  dashboard: "w-full",
  table: "w-full",
  form: "mx-auto w-full max-w-[960px]",
}

type Props = {
  variant: PageVariant
  children: React.ReactNode
  className?: string
}

/** 화면 타입별 폭 정책을 적용하는 페이지 래퍼. 세로 간격(gap)도 통일. */
export const AdminPage = ({ variant, children, className }: Props) => (
  <div className={clx("flex flex-col gap-y-4", VARIANT_CLASS[variant], className)}>
    {children}
  </div>
)

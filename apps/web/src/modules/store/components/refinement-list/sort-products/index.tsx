"use client"

import { useT } from "@lib/i18n/client"
import FilterRadioGroup from "@modules/common/components/filter-radio-group"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  "data-testid"?: string
}

/** 라벨은 화면 언어에 따라 달라지므로 렌더 시점에 만든다(2026-08-05 i18n). */
const sortOptionKeys = [
  { value: "created_at", key: "store.sort.latest" },
  { value: "price_asc", key: "store.sort.priceAsc" },
  { value: "price_desc", key: "store.sort.priceDesc" },
] as const

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const t = useT()
  const sortOptions = sortOptionKeys.map((o) => ({ value: o.value, label: t(o.key) }))
  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <FilterRadioGroup
      title={t("store.sortBy")}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts

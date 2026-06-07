/**
 * 상품 관리 화면 (목록 + 등록)
 *
 * - 목록: 실제 메두사 /admin/products 데이터 (react-query)
 * - 등록: 카테고리를 고르면 해당 상품군의 옵션 템플릿(의류→사이즈, 악세서리→호수)이
 *         자동으로 채워지고, 옵션 조합별 SKU/판매가(variant)를 입력해 실제 상품을 생성합니다.
 *
 * 메두사 코어는 수정하지 않고, 한국형 상품유형 모듈(/admin/product-types)만 추가 사용합니다.
 */
import { useMemo, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Button,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  clx,
} from "@medusajs/ui"
import { AdminPage } from "../../components/admin-page"
import { AdminDataTable, type Column } from "../../components/admin-data-table"
import {
  AdminStatusBadge,
  type StatusTone,
} from "../../components/admin-status-badge"
import { floatingResult } from "../../components/admin-floating-result"
import { krw } from "../../lib/admin-format"
import {
  createProduct,
  getCreateDefaults,
  listCategories,
  listProductTypes,
  listProducts,
  type ApiProduct,
  type DisclosureField,
} from "../../lib/admin-api"
import { Textarea } from "@medusajs/ui"

/* ===================== 공통 유틸 ===================== */

const STATUS_TONE: Record<ApiProduct["status"], { tone: StatusTone; label: string }> = {
  published: { tone: "success", label: "판매중" },
  draft: { tone: "neutral", label: "임시저장" },
  proposed: { tone: "warning", label: "검토중" },
  rejected: { tone: "danger", label: "반려" },
}

/** 첫 variant 의 판매가(해당 통화 우선, 없으면 첫 가격) 문자열 */
function firstPriceLabel(p: ApiProduct): string {
  const v = p.variants?.[0]
  const amount = v?.prices?.[0]?.amount
  return amount != null ? krw(amount) : "-"
}

/** 옵션 조합(cartesian) 생성 */
type Combo = { key: string; label: string; combo: Record<string, string> }
function buildCombos(options: OptionDraft[]): Combo[] {
  const valid = options.filter((o) => o.title.trim() && o.values.length > 0)
  if (valid.length === 0) return [{ key: "기본", label: "기본", combo: {} }]
  let acc: Record<string, string>[] = [{}]
  for (const o of valid) {
    const next: Record<string, string>[] = []
    for (const a of acc) for (const val of o.values) next.push({ ...a, [o.title]: val })
    acc = next
  }
  return acc.map((combo) => {
    const label = valid.map((o) => combo[o.title]).join(" / ")
    return { key: label, label, combo }
  })
}

type OptionDraft = { title: string; values: string[] }

/* ===================== 목록 화면 ===================== */

const ProductsPage = () => {
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["kr-products", q],
    queryFn: () => listProducts({ q: q || undefined, limit: 100 }),
  })

  const products = data?.products ?? []

  const columns: Column<ApiProduct>[] = [
    {
      key: "title",
      header: "상품",
      render: (p) => (
        <div className="flex items-center gap-x-3">
          <div className="h-8 w-8 shrink-0 rounded-md bg-ui-bg-component" />
          <span className="font-medium">{p.title}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "카테고리",
      render: (p) =>
        p.categories?.length ? (
          p.categories.map((c) => c.name).join(", ")
        ) : (
          <span className="text-ui-fg-muted">-</span>
        ),
    },
    {
      key: "price",
      header: "판매가",
      align: "right",
      render: (p) => firstPriceLabel(p),
    },
    {
      key: "variants",
      header: "옵션(SKU)",
      align: "right",
      render: (p) => `${p.variants?.length ?? 0}개`,
    },
    {
      key: "status",
      header: "판매상태",
      render: (p) => {
        const s = STATUS_TONE[p.status]
        return <AdminStatusBadge tone={s.tone}>{s.label}</AdminStatusBadge>
      },
    },
  ]

  return (
    <AdminPage variant="table">
      <div className="mb-4 flex items-center justify-between gap-x-3">
        <div>
          <Heading level="h1">상품 관리</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            전체 {data?.count ?? 0}개
          </Text>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          상품 등록
        </Button>
      </div>

      <div className="mb-3">
        <Input
          placeholder="상품명 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isError ? (
        <Text className="text-ui-fg-error">
          상품을 불러오지 못했습니다. 백엔드(로그인 세션)가 켜져 있는지 확인해 주세요.
        </Text>
      ) : isLoading ? (
        <Text className="text-ui-fg-subtle">불러오는 중…</Text>
      ) : (
        <AdminDataTable
          columns={columns}
          rows={products}
          rowKey={(p) => p.id}
          emptyText="등록된 상품이 없습니다. ‘상품 등록’으로 첫 상품을 추가해 보세요."
        />
      )}

      <ProductCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </AdminPage>
  )
}

/* ===================== 등록 모달 ===================== */

const ProductCreateModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  const queryClient = useQueryClient()

  const [title, setTitle] = useState("")
  const [fieldId, setFieldId] = useState<string>("") // 판매 분야(상품군)
  const [typeId, setTypeId] = useState<string>("") // 분류(옵션·고시 결정)
  const [categoryId, setCategoryId] = useState<string>("") // 진열 카테고리
  const [published, setPublished] = useState(false)
  const [options, setOptions] = useState<OptionDraft[]>([])
  const [basePrice, setBasePrice] = useState("")
  // 옵션 조합별 SKU/가격 오버라이드 (key = 조합 라벨)
  const [variantEdits, setVariantEdits] = useState<
    Record<string, { sku?: string; price?: string }>
  >({})
  // 상품정보고시 (유형 선택 시 자동 구성)
  const [disclosureFields, setDisclosureFields] = useState<DisclosureField[]>([])
  const [disclosureValues, setDisclosureValues] = useState<Record<string, string>>({})

  // 진열 카테고리 목록
  const { data: catData } = useQuery({
    queryKey: ["kr-categories"],
    queryFn: listCategories,
    enabled: open,
  })
  const categories = catData?.product_categories ?? []

  // 상품유형 목록 (옵션 템플릿 포함)
  const { data: typeData } = useQuery({
    queryKey: ["kr-product-types"],
    queryFn: listProductTypes,
    enabled: open,
  })
  const productTypes = typeData?.product_types ?? [] // 판매 분야 목록
  const selectedField = productTypes.find((t) => t.id === fieldId)
  const classes = selectedField?.children ?? [] // 선택 분야의 분류 목록

  const { data: defaults } = useQuery({
    queryKey: ["kr-create-defaults"],
    queryFn: getCreateDefaults,
    enabled: open,
  })

  // 판매 분야 변경 → 분류·옵션·고시 초기화
  const applyField = (id: string) => {
    setFieldId(id)
    setTypeId("")
    setOptions([])
    setDisclosureFields([])
    setDisclosureValues({})
    setVariantEdits({})
  }

  // 분류 변경 → 해당 분류의 옵션 템플릿 + 고시 필수항목 자동 주입
  const applyClass = (id: string) => {
    setTypeId(id)
    setVariantEdits({})
    const cls = classes.find((c) => c.id === id)
    const opts = cls?.options ?? []
    setOptions(
      [...opts]
        .sort((a, b) => a.rank - b.rank)
        .map((o) => ({ title: o.option_title, values: [...o.option_values] }))
    )
    const fields = [...(cls?.disclosure_fields ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    )
    setDisclosureFields(fields)
    setDisclosureValues({})
    if (opts.length > 0 || fields.length > 0) {
      floatingResult.info(
        `'${selectedField?.name} > ${cls?.name}' 적용 — 옵션 ${opts.length}종 · 고시 ${fields.length}개`
      )
    }
  }

  const combos = useMemo(() => buildCombos(options), [options])

  const reset = () => {
    setTitle("")
    setFieldId("")
    setTypeId("")
    setCategoryId("")
    setPublished(false)
    setOptions([])
    setBasePrice("")
    setVariantEdits({})
    setDisclosureFields([])
    setDisclosureValues({})
  }

  // 게시 전 고시 필수항목 누락 검사 (누락 시 사유 배열 반환)
  const missingRequiredDisclosure = (): string[] =>
    disclosureFields
      .filter((f) => f.required && !(disclosureValues[f.field_key] || "").trim())
      .map((f) => f.label)

  const mutation = useMutation({
    mutationFn: async () => {
      // 법정 검증: 게시(공개) 시 상품정보고시 필수항목 누락 차단 (전자상거래법 §13)
      if (published) {
        const missing = missingRequiredDisclosure()
        if (missing.length > 0) {
          throw new Error(
            `상품정보고시 필수항목 누락: ${missing.join(", ")} (게시하려면 모두 입력해야 합니다)`
          )
        }
      }
      const base = Number(basePrice.replace(/[^0-9]/g, "")) || 0
      const variants = combos.map((c) => {
        const edit = variantEdits[c.key] || {}
        const price = edit.price
          ? Number(edit.price.replace(/[^0-9]/g, "")) || base
          : base
        return {
          title: c.label,
          sku: edit.sku || undefined,
          price,
          options: c.combo,
        }
      })
      return createProduct(
        {
          title: title.trim(),
          status: published ? "published" : "draft",
          categoryId: categoryId || null,
          typeId: typeId || null,
          disclosure: disclosureValues,
          options: options.filter((o) => o.title.trim() && o.values.length > 0),
          variants,
        },
        defaults ?? {
          salesChannelId: null,
          shippingProfileId: null,
          currencyCode: "krw",
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kr-products"] })
      floatingResult.saved("상품을 등록했습니다.")
      reset()
      onOpenChange(false)
    },
    onError: (e: unknown) => {
      floatingResult.error(
        `상품 등록 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`
      )
    },
  })

  const canSubmit = title.trim().length > 0 && !mutation.isPending

  /* --- 옵션 편집 핸들러 --- */
  const addOption = () =>
    setOptions((prev) => [...prev, { title: "", values: [] }])
  const removeOption = (idx: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  const setOptionTitle = (idx: number, v: string) =>
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, title: v } : o)))
  const setOptionValues = (idx: number, raw: string) =>
    setOptions((prev) =>
      prev.map((o, i) =>
        i === idx
          ? { ...o, values: raw.split(",").map((s) => s.trim()).filter(Boolean) }
          : o
      )
    )

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title asChild>
            <span className="sr-only">상품 등록</span>
          </FocusModal.Title>
          <div className="flex w-full items-center justify-end gap-x-2">
            <Button
              variant="primary"
              disabled={!canSubmit}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              상품 등록
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <div>
              <Heading level="h1">상품 등록</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                상품유형을 고르면 옵션이 자동으로 채워집니다. 진열 카테고리는 별도로 지정합니다.
              </Text>
            </div>

            {/* 기본 정보 */}
            <section className="flex flex-col gap-y-4">
              <Heading level="h2">기본 정보</Heading>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="p-title">상품명 *</Label>
                <Input
                  id="p-title"
                  placeholder="예) 프리미엄 코튼 오버핏 티셔츠"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <div className="flex flex-col gap-y-2">
                  <Label>판매 분야 (상품군)</Label>
                  <Select value={fieldId} onValueChange={applyField}>
                    <Select.Trigger>
                      <Select.Value placeholder="분야 선택 (예: 의류)" />
                    </Select.Trigger>
                    <Select.Content>
                      {productTypes.map((t) => (
                        <Select.Item key={t.id} value={t.id}>
                          {t.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label>분류 (옵션·고시 결정)</Label>
                  <Select value={typeId} onValueChange={applyClass} disabled={!fieldId}>
                    <Select.Trigger>
                      <Select.Value
                        placeholder={fieldId ? "분류 선택 (예: 상의)" : "분야 먼저 선택"}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {classes.map((c) => (
                        <Select.Item key={c.id} value={c.id}>
                          {c.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-y-2">
                <Label>진열 카테고리</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <Select.Trigger>
                    <Select.Value placeholder="진열할 카테고리를 선택하세요" />
                  </Select.Trigger>
                  <Select.Content>
                    {categories.map((c) => (
                      <Select.Item key={c.id} value={c.id}>
                        {c.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex items-center gap-x-2">
                <Switch
                  id="p-status"
                  checked={published}
                  onCheckedChange={setPublished}
                />
                <Label htmlFor="p-status">바로 판매중으로 게시</Label>
              </div>
            </section>

            {/* 옵션 */}
            <section className="flex flex-col gap-y-4">
              <div className="flex items-center justify-between">
                <Heading level="h2">옵션</Heading>
                <Button variant="secondary" size="small" onClick={addOption}>
                  옵션 추가
                </Button>
              </div>
              {options.length === 0 ? (
                <Text className="text-ui-fg-muted" size="small">
                  카테고리를 고르면 옵션이 자동으로 채워집니다. (직접 추가도 가능)
                </Text>
              ) : (
                <div className="flex flex-col gap-y-3">
                  {options.map((o, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[200px_1fr_auto] items-end gap-x-3 rounded-lg border border-ui-border-base p-3"
                    >
                      <div className="flex flex-col gap-y-1">
                        <Label size="small">옵션명</Label>
                        <Input
                          value={o.title}
                          placeholder="예) 사이즈"
                          onChange={(e) => setOptionTitle(idx, e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-y-1">
                        <Label size="small">값 (쉼표로 구분)</Label>
                        <Input
                          value={o.values.join(", ")}
                          placeholder="예) S, M, L, XL"
                          onChange={(e) => setOptionValues(idx, e.target.value)}
                        />
                      </div>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => removeOption(idx)}
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 상품정보제공고시 (법정 필수) */}
            {disclosureFields.length > 0 && (
              <section className="flex flex-col gap-y-4">
                <div>
                  <Heading level="h2">상품정보제공고시 (법정 필수)</Heading>
                  <Text className="text-ui-fg-subtle" size="small">
                    전자상거래법상 필수 표시항목입니다. ✱ 항목은 게시 전 반드시 입력해야 합니다.
                  </Text>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {disclosureFields.map((f) => {
                    const missing =
                      published &&
                      f.required &&
                      !(disclosureValues[f.field_key] || "").trim()
                    return (
                      <div
                        key={f.field_key}
                        className={clx("flex flex-col gap-y-1", {
                          "col-span-2": f.input_type === "textarea",
                        })}
                      >
                        <Label size="small">
                          {f.label}
                          {f.required && (
                            <span className="text-ui-fg-error"> ✱</span>
                          )}
                        </Label>
                        {f.input_type === "textarea" ? (
                          <Textarea
                            value={disclosureValues[f.field_key] ?? ""}
                            onChange={(e) =>
                              setDisclosureValues((prev) => ({
                                ...prev,
                                [f.field_key]: e.target.value,
                              }))
                            }
                            className={clx({ "border-ui-border-error": missing })}
                          />
                        ) : (
                          <Input
                            size="small"
                            value={disclosureValues[f.field_key] ?? ""}
                            onChange={(e) =>
                              setDisclosureValues((prev) => ({
                                ...prev,
                                [f.field_key]: e.target.value,
                              }))
                            }
                            className={clx({ "border-ui-border-error": missing })}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 판매가 + variant 매트릭스 */}
            <section className="flex flex-col gap-y-4">
              <Heading level="h2">판매 정보</Heading>
              <div className="flex flex-col gap-y-2">
                <Label htmlFor="p-price">기본 판매가 (원)</Label>
                <Input
                  id="p-price"
                  inputMode="numeric"
                  placeholder="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="max-w-[200px]"
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-ui-border-base">
                <table className="w-full text-sm">
                  <thead className="bg-ui-bg-subtle text-ui-fg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">옵션 조합 (SKU)</th>
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-right font-medium">판매가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((c) => {
                      const edit = variantEdits[c.key] || {}
                      return (
                        <tr
                          key={c.key}
                          className="border-t border-ui-border-base"
                        >
                          <td className="px-3 py-2">{c.label}</td>
                          <td className="px-3 py-2">
                            <Input
                              size="small"
                              placeholder="자동"
                              value={edit.sku ?? ""}
                              onChange={(e) =>
                                setVariantEdits((prev) => ({
                                  ...prev,
                                  [c.key]: { ...prev[c.key], sku: e.target.value },
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              size="small"
                              inputMode="numeric"
                              placeholder={basePrice || "기본가"}
                              className={clx("text-right")}
                              value={edit.price ?? ""}
                              onChange={(e) =>
                                setVariantEdits((prev) => ({
                                  ...prev,
                                  [c.key]: {
                                    ...prev[c.key],
                                    price: e.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Text className="text-ui-fg-muted" size="small">
                옵션 조합 {combos.length}개 = SKU {combos.length}개가 생성됩니다.
                SKU·판매가를 비워두면 자동 생성/기본가가 적용됩니다.
              </Text>
            </section>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const config = defineRouteConfig({
  label: "상품 관리",
})

export default ProductsPage

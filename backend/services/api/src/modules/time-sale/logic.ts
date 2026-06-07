/**
 * 타임세일(Time Sale) 순수 로직 — DB 무관, 상태/가격 계산 전용.
 *
 * Rule One 정합: 할인율·할인금액 등 정책 수치는 코드에 박지 않고 호출자가 주입합니다.
 *  - 상태 판정: 시작/종료 시각(ISO) + 현재 시각(ISO) 만으로 결정.
 *  - 가격 계산: 원가 + 할인유형 + 할인값(주입) 으로 결정, 0원 바닥.
 *
 * deferred(미구현, 후속): 소진 자동종료(cron), 원가복원, 상품 큐레이션(조회수/위시/금칙어).
 */

export type SaleStatus = "scheduled" | "active" | "ended"
export type DiscountType = "percent" | "fixed"

/**
 * 세일 활성 여부 — startsAt <= now < endsAt 일 때만 true.
 *  - 경계: 시작 시각 포함(>=), 종료 시각 미포함(<).
 *  - 잘못된 ISO 입력은 false(안전 측).
 */
export function isSaleActive(
  startsAtIso: string,
  endsAtIso: string,
  nowIso: string
): boolean {
  const start = Date.parse(startsAtIso)
  const end = Date.parse(endsAtIso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(now)) return false
  return now >= start && now < end
}

/**
 * 세일 상태 판정.
 *  - now < startsAt        → "scheduled"(예정)
 *  - startsAt <= now < endsAt → "active"(진행)
 *  - now >= endsAt         → "ended"(종료)
 *  - 잘못된 ISO 입력은 "scheduled"(안전 측, 노출 보류).
 */
export function resolveSaleStatus(
  startsAtIso: string,
  endsAtIso: string,
  nowIso: string
): SaleStatus {
  const start = Date.parse(startsAtIso)
  const end = Date.parse(endsAtIso)
  const now = Date.parse(nowIso)
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(now)) return "scheduled"
  if (now < start) return "scheduled"
  if (now >= end) return "ended"
  return "active"
}

/**
 * 세일가 계산 — 정책 수치(discountValue)는 호출자 주입.
 *  - percent: 원가 * (1 - 할인율/100), 내림(Math.floor). 할인율은 0~100 범위 강제.
 *  - fixed:   원가 - 할인금액(차감).
 *  - 공통: 음수 방지 위해 0원 바닥(Math.max(0, ...)).
 *  - 유효하지 않은 원가/할인값(음수·NaN)은 안전하게 원가 또는 0 으로 수렴.
 */
export function calcSalePrice(
  originalPrice: number,
  discountType: DiscountType,
  discountValue: number
): number {
  const price = Number(originalPrice)
  const value = Number(discountValue)
  if (Number.isNaN(price) || price <= 0) return 0
  if (Number.isNaN(value) || value < 0) return Math.max(0, Math.floor(price))

  if (discountType === "percent") {
    const pct = Math.min(100, Math.max(0, value))
    return Math.max(0, Math.floor(price * (1 - pct / 100)))
  }
  // fixed
  return Math.max(0, Math.floor(price - value))
}

export type ValidateSaleInput = {
  discountType: DiscountType
  discountValue: number
  startsAt: string
  endsAt: string
}

export type ValidateSaleResult = {
  valid: boolean
  errors: string[]
}

/**
 * 세일 입력 검증 — 기간 정합 + 할인값 범위.
 *  - 할인유형: percent | fixed 만 허용.
 *  - percent: 0 < value <= 100.
 *  - fixed:   value > 0.
 *  - 기간: startsAt/endsAt 는 유효 ISO 여야 하고 startsAt < endsAt.
 * 정책 임계값(상한 할인율 등)은 코드에 박지 않습니다(Rule One).
 */
export function validateSale(input: ValidateSaleInput): ValidateSaleResult {
  const errors: string[] = []

  if (input.discountType !== "percent" && input.discountType !== "fixed") {
    errors.push(`허용되지 않은 할인유형입니다: ${String(input.discountType)}`)
  } else if (input.discountType === "percent") {
    if (!(input.discountValue > 0 && input.discountValue <= 100)) {
      errors.push("할인율은 0 초과 100 이하여야 합니다.")
    }
  } else {
    // fixed
    if (!(input.discountValue > 0)) {
      errors.push("할인금액은 0보다 커야 합니다.")
    }
  }

  const start = Date.parse(input.startsAt)
  const end = Date.parse(input.endsAt)
  if (Number.isNaN(start)) errors.push("시작 시각이 유효한 ISO 형식이 아닙니다.")
  if (Number.isNaN(end)) errors.push("종료 시각이 유효한 ISO 형식이 아닙니다.")
  if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
    errors.push("종료 시각은 시작 시각보다 이후여야 합니다.")
  }

  return { valid: errors.length === 0, errors }
}

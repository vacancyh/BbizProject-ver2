/**
 * 재고 조정 순수 로직 모듈 (d3 t006_재고관리 spec §9)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/products/page.tsx 의 재고 조정 핸들러가
 *   computeAdjustedQty 로 음수/예약초과를 먼저 차단한 뒤 코어
 *   updateLocationLevel(/admin/inventory-items/{id}/location-levels/{loc}) 호출.
 *
 * 코어 직접호출 원칙(§V0-5): 신규 route 없음. 음수 방지·예약 보호는 클라이언트 가드,
 * 실제 반영은 Medusa inventory-items location-levels 코어 호출.
 *
 * §V0 재발방지: 가용수량 음수화/예약초과 차감을 "조정 전" 단계에서 차단하는 단일 함수로
 * 통일 → UI/배치 어느 경로로 들어와도 동일 가드 적용(중복 검증 분기 제거).
 *
 * UT-001: 재고 증감 조정 → 가용/예약 반영
 * UT-002: 원자 차감 + 음수 방지 → 음수/예약초과 거부(409 상당)
 * UT-003: 대량 조정 충돌 처리 → 부분 실패 리포트
 *
 * 주: 실제 동시 차감 "직렬화 + DB CHECK 409"는 백엔드(트랜잭션/제약) 영역으로,
 *     본 모듈은 호출 직전 거부 가드와 결과 집계만 책임진다.
 */

/** 위치 레벨의 조정 전 상태(코어 location_level 부분집합) */
export type InventoryLevelSnapshot = {
  inventory_item_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
};

/** 단건 조정 결과 */
export type AdjustResult =
  | { ok: true; nextStocked: number; nextAvailable: number }
  | { ok: false; reason: string; code: "NEGATIVE_STOCK" | "BELOW_RESERVED" | "INVALID_DELTA" };

/** 가용수량 = 재고 - 예약 (음수면 0 바닥 처리하지 않고 그대로 노출하여 이상 감지) */
export function computeAvailable(stocked: number, reserved: number): number {
  return stocked - reserved;
}

/**
 * 재고 증감 조정 계산 + 음수/예약초과 가드 (UT-001 / UT-002)
 *
 * @param level  조정 대상 위치 레벨 스냅샷
 * @param delta  증감량(+ 입고 / - 출고). 정수만 허용.
 * @returns 성공 시 다음 재고/가용, 실패 시 거부 사유 + 코드(409 상당)
 */
export function computeAdjustedQty(
  level: InventoryLevelSnapshot,
  delta: number
): AdjustResult {
  if (!Number.isInteger(delta)) {
    return { ok: false, reason: "증감량은 정수여야 합니다", code: "INVALID_DELTA" };
  }

  const nextStocked = level.stocked_quantity + delta;

  // 음수 재고 방지 (UT-002)
  if (nextStocked < 0) {
    return {
      ok: false,
      reason: `재고가 음수가 됩니다(현재 ${level.stocked_quantity}, 요청 ${delta})`,
      code: "NEGATIVE_STOCK",
    };
  }

  // 예약 초과 차감 방지 — 가용수량이 음수가 되는 차감 거부 (UT-002)
  if (nextStocked < level.reserved_quantity) {
    return {
      ok: false,
      reason: `예약수량(${level.reserved_quantity})보다 적게 차감할 수 없습니다`,
      code: "BELOW_RESERVED",
    };
  }

  return {
    ok: true,
    nextStocked,
    nextAvailable: computeAvailable(nextStocked, level.reserved_quantity),
  };
}

/** 절대수량 설정(증감이 아닌 set) 검증 — 음수/예약 미만 차단 */
export function validateAbsoluteStock(
  level: InventoryLevelSnapshot,
  stockedQuantity: number
): AdjustResult {
  if (!Number.isInteger(stockedQuantity)) {
    return { ok: false, reason: "재고 수량은 정수여야 합니다", code: "INVALID_DELTA" };
  }
  return computeAdjustedQty(level, stockedQuantity - level.stocked_quantity);
}

/** 대량 조정 1건 입력 */
export type BulkAdjustInput = {
  level: InventoryLevelSnapshot;
  delta: number;
};

/** 대량 조정 리포트 (UT-003 부분 실패) */
export type BulkAdjustReport = {
  applicable: { level: InventoryLevelSnapshot; nextStocked: number }[];
  rejected: { inventory_item_id: string; location_id: string; reason: string; code: string }[];
  total: number;
};

/**
 * 대량 재고 조정 계획/리포트 (UT-003 충돌·부분 실패 처리)
 * - 거부된 행은 reason/code 와 함께 리포트, 적용 가능한 행만 applicable 로 분리.
 * - 실제 반영(코어 호출)은 호출측이 applicable 만 순회한다.
 */
export function buildBulkAdjustReport(inputs: BulkAdjustInput[]): BulkAdjustReport {
  const applicable: { level: InventoryLevelSnapshot; nextStocked: number }[] = [];
  const rejected: BulkAdjustReport["rejected"] = [];

  for (const { level, delta } of inputs) {
    const r = computeAdjustedQty(level, delta);
    if (r.ok) {
      applicable.push({ level, nextStocked: r.nextStocked });
    } else {
      rejected.push({
        inventory_item_id: level.inventory_item_id,
        location_id: level.location_id,
        reason: r.reason,
        code: r.code,
      });
    }
  }

  return { applicable, rejected, total: inputs.length };
}

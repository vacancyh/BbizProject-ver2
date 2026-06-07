/**
 * 주문 상태 전이 이력 순수 로직 단위 테스트
 * spec: dag/d2_주문관리/t002_주문상세.md §5 A2, §6 API2
 */
import { serializeStateHistory } from "../order-history-logic"

describe("serializeStateHistory", () => {
  // TC-1: 빈 배열 입력 → 빈 배열 반환
  it("TC-1: 빈 배열 입력 시 빈 배열을 반환한다", () => {
    const result = serializeStateHistory([])
    expect(result).toEqual([])
  })

  // TC-2: null 입력 → 빈 배열 반환 (null 안전)
  it("TC-2: null 입력 시 빈 배열을 반환한다", () => {
    const result = serializeStateHistory(null)
    expect(result).toEqual([])
  })

  // TC-3: undefined 입력 → 빈 배열 반환 (undefined 안전)
  it("TC-3: undefined 입력 시 빈 배열을 반환한다", () => {
    const result = serializeStateHistory(undefined)
    expect(result).toEqual([])
  })

  // TC-4: 필드 매핑 검증 (from_state → from, to_state → to)
  it("TC-4: from_state / to_state 를 from / to 로 정규화한다", () => {
    const rows = [
      {
        id: "hist-001",
        from_state: "pending",
        to_state: "confirmed",
        actor: "admin@test.com",
        metadata: { reason: "test" },
        created_at: "2026-06-03T10:00:00.000Z",
      },
    ]
    const result = serializeStateHistory(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: "hist-001",
      from: "pending",
      to: "confirmed",
      actor: "admin@test.com",
      metadata: { reason: "test" },
      created_at: "2026-06-03T10:00:00.000Z",
    })
  })

  // TC-5: created_at 오름차순 정렬 검증
  it("TC-5: created_at 오름차순으로 정렬한다", () => {
    const rows = [
      {
        id: "hist-003",
        from_state: "confirmed",
        to_state: "shipped",
        actor: "admin",
        metadata: null,
        created_at: "2026-06-03T12:00:00.000Z",
      },
      {
        id: "hist-001",
        from_state: "pending",
        to_state: "confirmed",
        actor: "admin",
        metadata: null,
        created_at: "2026-06-03T10:00:00.000Z",
      },
      {
        id: "hist-002",
        from_state: "confirmed",
        to_state: "processing",
        actor: "admin",
        metadata: null,
        created_at: "2026-06-03T11:00:00.000Z",
      },
    ]
    const result = serializeStateHistory(rows)
    expect(result.map((r) => r.id)).toEqual(["hist-001", "hist-002", "hist-003"])
  })

  // TC-6: null 필드 안전 처리 (from_state / to_state / actor / metadata 누락)
  it("TC-6: 누락된 필드는 null 로 정규화한다", () => {
    const rows = [
      {
        id: "hist-001",
        // from_state, to_state, actor, metadata 모두 없음
        created_at: "2026-06-03T09:00:00.000Z",
      },
    ]
    const result = serializeStateHistory(rows)
    expect(result).toHaveLength(1)
    expect(result[0].from).toBeNull()
    expect(result[0].to).toBeNull()
    expect(result[0].actor).toBeNull()
    expect(result[0].metadata).toBeNull()
  })

  // TC-7: created_at null 인 항목은 맨 뒤로 이동
  it("TC-7: created_at 이 null 인 항목은 정렬 후 맨 뒤에 위치한다", () => {
    const rows = [
      {
        id: "hist-no-date",
        from_state: "x",
        to_state: "y",
        actor: null,
        metadata: null,
        created_at: null,
      },
      {
        id: "hist-dated",
        from_state: "a",
        to_state: "b",
        actor: null,
        metadata: null,
        created_at: "2026-06-03T08:00:00.000Z",
      },
    ]
    const result = serializeStateHistory(rows)
    expect(result[0].id).toBe("hist-dated")
    expect(result[1].id).toBe("hist-no-date")
  })
})

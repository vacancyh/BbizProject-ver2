/**
 * 정책 저장소 모듈 서비스 — system_policies 통합 + 변경 이중확인 + 변경이력.
 *
 * 주요 메서드:
 *  - seedDefaults()                 = 기본 정책 시드(idempotent)
 *  - list(category?)                = 정책 목록
 *  - get(key)                       = 정책 1건
 *  - set(key, value, actor, confirm) = 정책 변경(이중확인 필수) + 이력 적재
 *  - history(key)                   = 변경이력(최신순)
 *
 * 이중확인: set 은 confirm=true 가 아니면 거부(엔드포인트는 FE ConfirmModal 재확인 후 confirm 전달).
 * 변경 이력은 append-only(생성만). 변경 시 호출측(엔드포인트)이 감사 로그를 함께 기록한다.
 * 순수 판정 로직(requireConfirm, validatePolicyValue, isSuperRole)은 logic.ts 에서 관리.
 */
import { MedusaService } from "@medusajs/framework/utils"
import SystemPolicy from "./models/system-policy"
import PolicyHistory from "./models/policy-history"
import { DEFAULT_POLICIES } from "./seed/defaults"
import { requireConfirm, validatePolicyValue } from "./logic"

export type PolicyActor = { id?: string | null; email?: string | null }

class PolicyModuleService extends MedusaService({
  SystemPolicy,
  PolicyHistory,
}) {
  /** 기본 정책 시드(idempotent). */
  async seedDefaults(): Promise<{ policies: number }> {
    for (const p of DEFAULT_POLICIES) {
      const ex = await this.listSystemPolicies({ key: p.key })
      if (!ex.length) {
        await this.createSystemPolicies([{ ...p, value: p.value as any }])
      }
    }
    const all = await this.listSystemPolicies({})
    return { policies: all.length }
  }

  /** 정책 목록(분류 선택). */
  async list(category?: string): Promise<any[]> {
    const where: Record<string, unknown> = {}
    if (category) where.category = category
    return this.listSystemPolicies(where, { order: { category: "ASC", key: "ASC" } })
  }

  /** 정책 1건 조회. */
  async get(key: string): Promise<any | null> {
    const ex = await this.listSystemPolicies({ key })
    return ex.length ? ex[0] : null
  }

  /**
   * 정책 변경(이중확인 필수). 변경 전후를 PolicyHistory 에 적재.
   * 순수 판정: logic.requireConfirm(confirm) + logic.validatePolicyValue(value, valueType).
   * @throws confirm 이 true 가 아니거나 정책이 없으면 에러
   */
  async set(
    key: string,
    value: unknown,
    actor: PolicyActor = {},
    confirm = false
  ): Promise<any> {
    // logic.ts: 이중확인 게이트(requireConfirm)
    requireConfirm(confirm)
    const ex = await this.listSystemPolicies({ key })
    if (!ex.length) {
      throw new Error(`[policy] 존재하지 않는 정책입니다: ${key}`)
    }
    // logic.ts: 값 타입 검증(validatePolicyValue)
    const valueType = ex[0].value_type as "string" | "number" | "boolean"
    validatePolicyValue(value, valueType)
    const before = ex[0].value
    // model.json() 타입은 Record 로 추론되나 jsonb 는 원시값(숫자/불리언)도 저장 가능 → as any 캐스팅
    const [updated] = await this.updateSystemPolicies([
      { id: ex[0].id, value: value as any, updated_by: actor.id ?? null },
    ])
    await this.createPolicyHistories([
      {
        policy_key: key,
        before: before as any,
        after: value as any,
        actor_id: actor.id ?? null,
        actor_email: actor.email ?? null,
      },
    ])
    return updated
  }

  /** 정책 변경이력(최신순). */
  async history(key: string): Promise<any[]> {
    return this.listPolicyHistories(
      { policy_key: key },
      { order: { created_at: "DESC" } }
    )
  }
}

export default PolicyModuleService

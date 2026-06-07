/**
 * 멤버십 등급 정책 조회·변경 Admin API
 *
 *  - GET  /admin/membership/policy
 *      등급 구간/적립률 정책(policy `membership.tiers`)을 시드(idempotent) 후 반환.
 *  - POST /admin/membership/policy
 *      등급 정책 변경. body = { tiers: Tier[], confirm: true }
 *      validateTierPolicy 선행(단조증가·적립률 0~100) → 실패 시 400.
 *      policy 모듈 set(이중확인 필수) 경유 + 감사 로그 기록.
 *
 * 정책 저장소는 별도 테이블을 신설하지 않고 기존 policy 모듈을 재사용한다(§V0-5 / §V0 단일 진실).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { POLICY_MODULE } from "../../../../modules/policy"
import PolicyModuleService from "../../../../modules/policy/service"
import { AUDIT_MODULE } from "../../../../modules/audit"
import AuditModuleService from "../../../../modules/audit/service"
import {
  DEFAULT_TIERS,
  parseTiersPolicy,
  validateTierPolicy,
} from "../../../../modules/membership/logic"

const TIERS_KEY = "membership.tiers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  // membership.tiers 포함 기본 정책 시드(idempotent)
  await policy.seedDefaults()
  const row = await policy.get(TIERS_KEY)
  const tiers = row ? parseTiersPolicy(row.value) : DEFAULT_TIERS
  res.json({ key: TIERS_KEY, tiers, label: row?.label ?? "회원 등급 구간" })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const body = (req.body ?? {}) as { tiers?: unknown; confirm?: boolean }

  if (body.confirm !== true) {
    res.status(409).json({ message: "정책 변경에는 이중확인(confirm=true)이 필요합니다." })
    return
  }
  // 룰 검증(§V0 단일 진실 — 동일 validateTierPolicy 로 화면/서버 일관)
  const check = validateTierPolicy(body.tiers as any)
  if (!check.valid) {
    res.status(400).json({ message: "등급 정책 검증 실패", errors: check.errors })
    return
  }

  // membership.tiers 가 아직 없을 수 있으므로 시드 후 변경
  await policy.seedDefaults()

  const actorId = (req as any).auth_context?.actor_id ?? null
  let actorEmail: string | null = null
  if (actorId) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "user",
        fields: ["email"],
        filters: { id: actorId },
      })
      actorEmail = data?.[0]?.email ?? null
    } catch {
      actorEmail = null
    }
  }

  const updated = await policy.set(TIERS_KEY, body.tiers, { id: actorId, email: actorEmail }, true)

  try {
    const audit = req.scope.resolve(AUDIT_MODULE) as unknown as AuditModuleService
    await audit.record({
      actor_id: actorId,
      actor_email: actorEmail,
      action: "정책 변경(membership.tiers)",
      method: "POST",
      path: req.path,
      target_type: "policy",
      target_id: TIERS_KEY,
      status_code: 200,
      diff: { key: TIERS_KEY, value: body.tiers },
      ip: req.ip ?? null,
    })
  } catch {
    // 감사 기록 실패가 정책 변경 자체를 막지 않도록 무시
  }

  res.json({ key: TIERS_KEY, policy: updated })
}

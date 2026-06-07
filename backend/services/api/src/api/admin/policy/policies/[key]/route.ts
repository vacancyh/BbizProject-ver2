/**
 * 시스템 정책 조회·변경 Admin API
 *
 *  - GET  /admin/policy/policies/:key
 *      정책 1건 + 변경이력(최신순) 반환.
 *  - POST /admin/policy/policies/:key
 *      정책 값 변경(이중확인 필수). body = { value, confirm: true }
 *      변경 시 PolicyHistory 적재 + 감사 로그 기록.
 *
 * 권한 검사(이 경로의 write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { POLICY_MODULE } from "../../../../../modules/policy"
import PolicyModuleService from "../../../../../modules/policy/service"
import { AUDIT_MODULE } from "../../../../../modules/audit"
import AuditModuleService from "../../../../../modules/audit/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const key = req.params.key
  const found = await policy.get(key)
  if (!found) {
    res.status(404).json({ message: `존재하지 않는 정책입니다: ${key}` })
    return
  }
  const history = await policy.history(key)
  res.json({ policy: found, history })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const key = req.params.key
  const body = (req.body ?? {}) as { value?: unknown; confirm?: boolean }

  if (body.confirm !== true) {
    res.status(409).json({ message: "정책 변경에는 이중확인(confirm=true)이 필요합니다." })
    return
  }
  if (body.value === undefined) {
    res.status(400).json({ message: "value 가 필요합니다." })
    return
  }

  // 행위자 식별(감사/이력 기록용) — core user 는 읽기만
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

  const updated = await policy.set(
    key,
    body.value,
    { id: actorId, email: actorEmail },
    true
  )

  // 감사 로그(정책 변경) — 미들웨어와 별개로 명시 기록(대상/이력 메타 포함)
  try {
    const audit = req.scope.resolve(AUDIT_MODULE) as unknown as AuditModuleService
    await audit.record({
      actor_id: actorId,
      actor_email: actorEmail,
      action: `정책 변경(${key})`,
      method: "POST",
      path: req.path,
      target_type: "policy",
      target_id: key,
      status_code: 200,
      diff: { key, value: body.value },
      ip: req.ip ?? null,
    })
  } catch {
    // 감사 기록 실패가 정책 변경 자체를 막지 않도록 무시(미들웨어가 보조 기록)
  }

  res.json({ policy: updated })
}

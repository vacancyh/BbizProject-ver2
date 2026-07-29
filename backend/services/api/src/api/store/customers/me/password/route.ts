/**
 * 로그인 고객 비밀번호 변경 Store API (2026-07-29 신설)
 *
 *  - POST /store/customers/me/password { current_password, new_password }
 *
 * 왜 커스텀 라우트인가:
 *  Medusa 코어의 `POST /auth/customer/emailpass/update` 는 **비밀번호 재설정 토큰**을 요구한다.
 *  재설정 토큰은 이메일로 발송되는데 알림 provider 가 없으면 받을 수 없어, 로그인 상태에서의
 *  "비밀번호 변경"이 불가능했다(실제로 401). 그래서 세션 인증 기반의 전용 경로를 둔다.
 *
 * 보안:
 *  - `/store/customers/me*` 는 Medusa 가 고객 인증을 강제한다(미인증 401).
 *  - **현재 비밀번호를 재확인**한 뒤에만 변경한다(세션 탈취 상태에서의 임의 변경 방지).
 *  - 이메일은 서버가 세션의 customer 에서 읽는다(클라이언트 입력 신뢰 금지).
 *  - 실패 사유는 일반화해 계정 존재/상태를 유추하지 못하게 한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const MIN_LENGTH = 8

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const body = (req.body ?? {}) as {
    current_password?: string
    new_password?: string
  }
  const current = String(body.current_password ?? "")
  const next = String(body.new_password ?? "")

  if (!current || !next) {
    res.status(400).json({ message: "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요." })
    return
  }
  if (next.length < MIN_LENGTH) {
    res.status(400).json({ message: `새 비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.` })
    return
  }
  if (current === next) {
    res.status(400).json({ message: "현재 비밀번호와 다른 비밀번호를 사용해 주세요." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId } as Record<string, unknown>,
  })
  const email = (data ?? [])[0]?.email as string | undefined
  if (!email) {
    res.status(400).json({ message: "계정 정보를 확인할 수 없습니다." })
    return
  }

  const authModule = req.scope.resolve(Modules.AUTH) as any

  // 1) 현재 비밀번호 재확인
  try {
    const verified = await authModule.authenticate("emailpass", {
      body: { email, password: current },
    })
    if (!verified?.success) {
      res.status(400).json({ message: "현재 비밀번호가 올바르지 않습니다." })
      return
    }
  } catch {
    res.status(400).json({ message: "현재 비밀번호가 올바르지 않습니다." })
    return
  }

  // 2) 자격 갱신
  try {
    const updated = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password: next,
    })
    if (updated && updated.success === false) {
      throw new Error(updated.error ?? "update failed")
    }
  } catch (e) {
    console.warn(`[password] 변경 실패(customer=${customerId}): ${(e as Error)?.message}`)
    res.status(500).json({ message: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." })
    return
  }

  res.json({ ok: true })
}

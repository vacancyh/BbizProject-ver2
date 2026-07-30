/**
 * 로그인 고객 이메일 변경 Store API (2026-07-29 신설)
 *
 *  - POST /store/customers/me/email { new_email, current_password }
 *
 * 왜 커스텀 라우트인가:
 *  이메일은 **로그인 아이디**(emailpass provider identity 의 entity_id)를 겸한다.
 *  customer.email 만 바꾸면 로그인 자격은 옛 이메일에 남아 **로그인이 깨진다.**
 *  그래서 고객 레코드와 인증 자격을 함께 갱신한다.
 *
 *  기존 화면은 이메일 수정 폼이 있었지만 **아무 것도 하지 않고 성공 메시지만 표시**했다
 *  ("TODO: It seems we don't support updating emails now?") — 사용자를 오해시키는 상태였다.
 *
 * 보안:
 *  - `/store/customers/me*` 는 Medusa 가 고객 인증을 강제한다(미인증 401).
 *  - 계정 탈취 시 이메일만 바꿔 계정을 통째로 가져가는 것을 막기 위해 **현재 비밀번호를 재확인**한다.
 *  - 이미 사용 중인 이메일이면 거부(계정 병합/탈취 방지).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const body = (req.body ?? {}) as { new_email?: string; current_password?: string }
  const newEmail = String(body.new_email ?? "").trim().toLowerCase()
  const password = String(body.current_password ?? "")

  if (!EMAIL_RE.test(newEmail)) {
    res.status(400).json({ message: "올바른 이메일 주소를 입력해 주세요." })
    return
  }
  if (!password) {
    res.status(400).json({ message: "본인 확인을 위해 현재 비밀번호를 입력해 주세요." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId } as Record<string, unknown>,
  })
  const currentEmail = (data ?? [])[0]?.email as string | undefined
  if (!currentEmail) {
    res.status(400).json({ message: "계정 정보를 확인할 수 없습니다." })
    return
  }
  if (currentEmail.toLowerCase() === newEmail) {
    res.status(400).json({ message: "현재 이메일과 다른 주소를 입력해 주세요." })
    return
  }

  // 이미 사용 중인 이메일인지 확인(계정 병합·탈취 방지)
  const { data: dup } = await query.graph({
    entity: "customer",
    fields: ["id"],
    filters: { email: newEmail } as Record<string, unknown>,
  })
  if ((dup ?? []).length > 0) {
    res.status(409).json({ message: "이미 사용 중인 이메일입니다." })
    return
  }

  const authModule = req.scope.resolve(Modules.AUTH) as any

  // 1) 본인 확인 — 현재 비밀번호
  try {
    const verified = await authModule.authenticate("emailpass", {
      body: { email: currentEmail, password },
    })
    if (!verified?.success) {
      res.status(400).json({ message: "현재 비밀번호가 올바르지 않습니다." })
      return
    }
  } catch {
    res.status(400).json({ message: "현재 비밀번호가 올바르지 않습니다." })
    return
  }

  // 2) 로그인 자격(provider identity)의 entity_id 를 새 이메일로 변경
  try {
    const identities = await authModule.listProviderIdentities({
      entity_id: currentEmail,
      provider: "emailpass",
    })
    const identity = (identities ?? [])[0]
    if (!identity?.id) {
      throw new Error("emailpass provider identity not found")
    }
    await authModule.updateProviderIdentities([
      { id: identity.id, entity_id: newEmail },
    ])
  } catch (e) {
    console.warn(`[email-change] 자격 갱신 실패(customer=${customerId}): ${(e as Error)?.message}`)
    res.status(500).json({ message: "이메일 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." })
    return
  }

  // 3) 고객 레코드 갱신 — 실패 시 자격을 되돌려 로그인 불능 상태를 만들지 않는다
  try {
    await updateCustomersWorkflow(req.scope).run({
      input: { selector: { id: customerId }, update: { email: newEmail } },
    })
  } catch (e) {
    try {
      const identities = await authModule.listProviderIdentities({
        entity_id: newEmail,
        provider: "emailpass",
      })
      const identity = (identities ?? [])[0]
      if (identity?.id) {
        await authModule.updateProviderIdentities([
          { id: identity.id, entity_id: currentEmail },
        ])
      }
    } catch {
      // 롤백 실패는 로그로만 — 아래에서 오류 응답
    }
    console.warn(`[email-change] 고객 갱신 실패(customer=${customerId}): ${(e as Error)?.message}`)
    res.status(500).json({ message: "이메일 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." })
    return
  }

  res.json({ ok: true, email: newEmail })
}

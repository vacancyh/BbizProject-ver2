"use client"

import { Button } from "@modules/common/components/ui"
import {
  requestPasswordReset,
  resetPassword,
} from "@lib/data/password-reset"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState, useTransition } from "react"

// token+email 쿼리가 있으면 '새 비밀번호 설정', 없으면 '재설정 요청'
const PasswordReset = ({
  token,
  emailParam,
}: {
  token?: string
  emailParam?: string
}) => {
  const isReset = !!token
  const [email, setEmail] = useState(emailParam ?? "")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("올바른 이메일 주소를 입력해 주세요.")
      return
    }
    startTransition(async () => {
      await requestPasswordReset(email.trim())
      setDone(true)
    })
  }

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }
    startTransition(async () => {
      const res = await resetPassword(email.trim(), token!, password)
      if (res.ok) setDone(true)
      else setError(res.error ?? "재설정 실패")
    })
  }

  if (done) {
    return (
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 max-w-md">
        {isReset ? (
          <p className="text-base-regular text-ui-fg-base">
            비밀번호가 변경되었습니다.{" "}
            <LocalizedClientLink href="/account" className="underline">
              로그인하기
            </LocalizedClientLink>
          </p>
        ) : (
          <p className="text-base-regular text-ui-fg-base">
            입력하신 이메일로 비밀번호 재설정 링크를 보내드렸습니다. 메일함을
            확인해 주세요.
          </p>
        )}
      </div>
    )
  }

  if (isReset) {
    return (
      <form onSubmit={handleReset} className="flex flex-col gap-y-3 max-w-md" data-testid="reset-form">
        <p className="text-base-regular text-ui-fg-subtle mb-2">
          새 비밀번호를 입력해 주세요.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호 (6자 이상)"
          className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="new-password"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="새 비밀번호 확인"
          className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="confirm-password"
        />
        {error && <p className="text-small-regular text-ui-tag-red-text">{error}</p>}
        <Button type="submit" className="rounded-none h-12" isLoading={isPending}>
          비밀번호 변경
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequest} className="flex flex-col gap-y-3 max-w-md" data-testid="request-form">
      <p className="text-base-regular text-ui-fg-subtle mb-2">
        가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="reset-email"
      />
      {error && <p className="text-small-regular text-ui-tag-red-text">{error}</p>}
      <Button type="submit" className="rounded-none h-12" isLoading={isPending}>
        재설정 링크 받기
      </Button>
      <LocalizedClientLink
        href="/account"
        className="text-small-regular text-ui-fg-muted underline text-center mt-2"
      >
        로그인으로 돌아가기
      </LocalizedClientLink>
    </form>
  )
}

export default PasswordReset

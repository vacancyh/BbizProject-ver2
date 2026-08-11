"use client"

import { useT } from "@lib/i18n/client"
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
  const t = useT()
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
      setError(t("reset.invalidEmail"))
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
      setError(t("reset.tooShort"))
      return
    }
    if (password !== confirm) {
      setError(t("reset.mismatch"))
      return
    }
    startTransition(async () => {
      const res = await resetPassword(email.trim(), token!, password)
      if (res.ok) setDone(true)
      else setError(res.error ?? t("reset.failed"))
    })
  }

  if (done) {
    return (
      <div className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 max-w-md">
        {isReset ? (
          <p className="text-base-regular text-ui-fg-base">
            {t("reset.changed")}{" "}
            <LocalizedClientLink href="/account" className="underline">
              {t("reset.goLogin")}
            </LocalizedClientLink>
          </p>
        ) : (
          <p className="text-base-regular text-ui-fg-base">
            {t("reset.linkSent")}
          </p>
        )}
      </div>
    )
  }

  if (isReset) {
    return (
      <form onSubmit={handleReset} className="flex flex-col gap-y-3 max-w-md" data-testid="reset-form">
        <p className="text-base-regular text-ui-fg-subtle mb-2">
          {t("reset.enterNew")}
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("reset.newPlaceholder")}
          className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="new-password"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("reset.confirmPlaceholder")}
          className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="confirm-password"
        />
        {error && <p className="text-small-regular text-ui-tag-red-text">{error}</p>}
        <Button type="submit" className="rounded-none h-12" isLoading={isPending}>
          {t("reset.submit")}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequest} className="flex flex-col gap-y-3 max-w-md" data-testid="request-form">
      <p className="text-base-regular text-ui-fg-subtle mb-2">
        {t("reset.requestHint")}
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("reset.emailPlaceholder")}
        className="border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="reset-email"
      />
      {error && <p className="text-small-regular text-ui-tag-red-text">{error}</p>}
      <Button type="submit" className="rounded-none h-12" isLoading={isPending}>
        {t("reset.requestSubmit")}
      </Button>
      <LocalizedClientLink
        href="/account"
        className="text-small-regular text-ui-fg-muted underline text-center mt-2"
      >
        {t("reset.backToLogin")}
      </LocalizedClientLink>
    </form>
  )
}

export default PasswordReset

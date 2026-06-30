"use client"

import { socialLoginMock } from "@lib/data/customer"
import { useParams } from "next/navigation"
import { useState } from "react"

const SocialLogin = () => {
  const { countryCode } = useParams() as { countryCode: string }
  const [pending, setPending] = useState<string | null>(null)

  const handle = async (provider: "kakao" | "naver") => {
    setPending(provider)
    await socialLoginMock(countryCode, provider)
    // 성공 시 서버액션이 /account 로 redirect
    setPending(null)
  }

  return (
    <div className="w-full mt-6" data-testid="social-login">
      <div className="flex items-center gap-x-3 my-4">
        <span className="flex-1 h-px bg-ui-border-base" />
        <span className="text-small-regular text-ui-fg-muted">
          간편 로그인
        </span>
        <span className="flex-1 h-px bg-ui-border-base" />
      </div>
      <div className="flex flex-col gap-y-2">
        <button
          type="button"
          onClick={() => handle("kakao")}
          disabled={!!pending}
          className="w-full h-11 rounded-none bg-[#FEE500] text-[#191600] text-base font-medium disabled:opacity-60"
          data-testid="kakao-login"
        >
          {pending === "kakao" ? "로그인 중..." : "카카오로 시작하기"}
        </button>
        <button
          type="button"
          onClick={() => handle("naver")}
          disabled={!!pending}
          className="w-full h-11 rounded-none bg-[#03C75A] text-white text-base font-medium disabled:opacity-60"
          data-testid="naver-login"
        >
          {pending === "naver" ? "로그인 중..." : "네이버로 시작하기"}
        </button>
      </div>
      <p className="text-xsmall-regular text-ui-fg-muted mt-2 text-center">
        ※ 데모 환경 — 실제 운영 시 카카오/네이버 OAuth 연동
      </p>
    </div>
  )
}

export default SocialLogin

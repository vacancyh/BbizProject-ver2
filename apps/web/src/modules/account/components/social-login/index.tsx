"use client"

import { useT } from "@lib/i18n/client"
import { socialLoginMock } from "@lib/data/customer"
import { useParams } from "next/navigation"
import { useState } from "react"

/**
 * 간편 로그인 (카카오/네이버)
 *
 * ⚠️ 2026-08-03 안전장치 추가 — 실측으로 확인된 위험 때문이다.
 *
 * 현재 구현은 **실제 OAuth 가 아니라 데모용 목(mock)** 이다.
 * `socialLoginMock` 은 하드코딩된 데모 계정(kakao-demo@kr-demo.local)으로 로그인시킨다.
 * 즉 **버튼을 누른 모든 방문자가 같은 계정에 들어간다.**
 *
 * 실측(브라우저 컨텍스트 2개로 각각 로그인):
 *   [방문자 A] 이메일 = kakao-demo@kr-demo.local
 *   [방문자 B] 이메일 = kakao-demo@kr-demo.local   ← 동일
 *
 * 이대로 운영에 나가면 고객 B 가 고객 A 의 **주문내역·배송지·연락처를 그대로 본다.**
 * 개인정보보호법 위반이고, 화면 하단의 작은 "데모 환경" 안내로는 막을 수 없다
 * (고객은 안내를 읽지 않고 버튼을 누른다).
 *
 * → 실제 OAuth 연동 전까지 **운영에서는 노출 자체를 막는다.**
 *   개발에서는 편의를 위해 계속 쓸 수 있게 두되, 경고를 눈에 띄게 표시한다.
 *
 * 실제 연동 시: 이 컴포넌트를 카카오/네이버 OAuth 리다이렉트로 교체하고
 * ENABLED 판정을 실제 클라이언트 키 유무로 바꿀 것.
 */

/** 데모 로그인을 노출해도 되는 환경인가 — 운영에서는 기본 차단 */
const DEMO_LOGIN_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_DEMO_SOCIAL_LOGIN === "true"

const SocialLogin = () => {
  // 훅은 조기 return(DEMO_LOGIN_ALLOWED) 보다 먼저 호출해야 한다 — 훅 순서 규칙
  const t = useT()
  const { countryCode } = useParams() as { countryCode: string }
  const [pending, setPending] = useState<string | null>(null)

  // 운영에서 실제 OAuth 없이 노출되면 계정 공유 사고가 난다 → 아예 렌더하지 않는다.
  if (!DEMO_LOGIN_ALLOWED) return null

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
        <span className="text-small-regular text-ui-fg-muted">{t("social.divider")}</span>
        <span className="flex-1 h-px bg-ui-border-base" />
      </div>

      {/* 데모라는 사실을 버튼 위에, 눈에 띄게 둔다. 하단의 작은 각주로는 부족하다. */}
      <div
        className="mb-3 rounded-rounded border border-ui-border-error bg-ui-bg-subtle px-3 py-2"
        role="note"
        data-testid="social-login-demo-warning"
      >
        <p className="text-xsmall-regular text-ui-fg-error">
          {t("social.demoWarning1")}
          <strong>{t("social.demoWarning2")}</strong>
          {t("social.demoWarning3")}
        </p>
        <p className="text-xsmall-regular text-ui-fg-muted mt-1">
          {t("social.demoNote")}
        </p>
      </div>

      <div className="flex flex-col gap-y-2">
        <button
          type="button"
          onClick={() => handle("kakao")}
          disabled={!!pending}
          className="w-full h-11 rounded-none bg-[#FEE500] text-[#191600] text-base font-medium disabled:opacity-60"
          data-testid="kakao-login"
        >
          {pending === "kakao" ? t("social.signingIn") : t("social.kakao")}
        </button>
        <button
          type="button"
          onClick={() => handle("naver")}
          disabled={!!pending}
          className="w-full h-11 rounded-none bg-[#03C75A] text-white text-base font-medium disabled:opacity-60"
          data-testid="naver-login"
        >
          {pending === "naver" ? t("social.signingIn") : t("social.naver")}
        </button>
      </div>
    </div>
  )
}

export default SocialLogin

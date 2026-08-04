"use client"

import { Button } from "@modules/common/components/ui"
import { useState } from "react"

/**
 * 휴대폰 본인인증 (데모) — 실제 운영 시 PASS/NICE 연동 필요.
 *
 * ⚠️ 2026-08-03 안전장치 추가.
 *
 * 이 컴포넌트는 **아무 실질적 효과가 없다.**
 *  - 인증번호가 고정값(000000)이고 화면에 그대로 표시된다
 *  - 인증 결과가 서버로 전송되지 않는다(순수 클라이언트 state)
 *  - 즉 "✓ 본인인증이 완료되었습니다" 표시만 뜰 뿐, 어디에도 기록되지 않는다
 *
 * 그런데 고객은 그 문구를 보고 **인증이 됐다고 믿는다.**
 * 운영에 이대로 나가면 만 14세 미만 차단 같은 법적 목적을 전혀 달성하지 못하면서
 * 인증을 한 것처럼 보이게 만든다 — 안 하느니 못하다.
 *
 * → 실제 본인인증 연동 전까지 **운영에서는 노출 자체를 막는다.**
 *   개발에서는 화면 흐름 확인용으로 남기되 데모임을 눈에 띄게 알린다.
 */
const DEMO_VERIFY_ALLOWED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_DEMO_PHONE_VERIFY === "true"

const PhoneVerify = () => {
  const [phone, setPhone] = useState("")
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 운영에서 "인증한 척"하는 UI 가 나가면 안 된다 → 아예 렌더하지 않는다.
  if (!DEMO_VERIFY_ALLOWED) return null

  const sendCode = () => {
    setError(null)
    if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone.trim())) {
      setError("올바른 휴대폰 번호를 입력해 주세요.")
      return
    }
    // 데모용 고정 인증번호
    setSent("000000")
  }

  const verify = () => {
    setError(null)
    if (code.trim() === sent) {
      setVerified(true)
    } else {
      setError("인증번호가 일치하지 않습니다.")
    }
  }

  if (verified) {
    return (
      <p
        className="text-small-regular text-ui-fg-interactive"
        data-testid="phone-verified"
      >
        ✓ 휴대폰 본인인증이 완료되었습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-y-2" data-testid="phone-verify">
      <span className="text-small-regular text-ui-fg-subtle">
        휴대폰 본인인증 (선택 · 데모)
      </span>
      {/* 데모라는 사실을 입력창 위에 둔다. 아래 각주만으로는 읽히지 않는다. */}
      <div
        className="rounded-rounded border border-ui-border-error bg-ui-bg-subtle px-3 py-2"
        role="note"
        data-testid="phone-verify-demo-warning"
      >
        <p className="text-xsmall-regular text-ui-fg-error">
          ⚠️ 실제 본인인증이 아닙니다. 인증 결과는 저장되지 않으며,
          운영 배포 시 이 영역은 표시되지 않습니다.
        </p>
      </div>
      <div className="flex gap-x-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="flex-1 border border-ui-border-base rounded-none bg-transparent px-3 h-11 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="verify-phone"
        />
        <Button
          type="button"
          variant="secondary"
          className="rounded-none h-11 whitespace-nowrap"
          onClick={sendCode}
        >
          인증번호 발송
        </Button>
      </div>
      {sent && (
        <>
          <div className="flex gap-x-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="인증번호 6자리"
              className="flex-1 border border-ui-border-base rounded-none bg-transparent px-3 h-11 text-base-regular outline-none focus:border-ui-fg-base"
              data-testid="verify-code"
            />
            <Button
              type="button"
              className="rounded-none h-11"
              onClick={verify}
            >
              확인
            </Button>
          </div>
          <p className="text-xsmall-regular text-ui-fg-muted">
            ※ 데모: 인증번호는 {sent} 입니다 (실제 운영 시 PASS/NICE 연동)
          </p>
        </>
      )}
      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}
    </div>
  )
}

export default PhoneVerify

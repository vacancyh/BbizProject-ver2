"use client"

import { Button } from "@modules/common/components/ui"
import { useState } from "react"

// 휴대폰 본인인증 (MOCK) — 실제 운영 시 PASS/NICE 본인인증 연동.
// 데모: 인증번호 발송 → 6자리 입력 → 인증 완료. (발송 코드는 데모로 화면에 표시)
const PhoneVerify = () => {
  const [phone, setPhone] = useState("")
  const [sent, setSent] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        휴대폰 본인인증 (선택)
      </span>
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

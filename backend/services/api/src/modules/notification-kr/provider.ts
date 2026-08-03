/**
 * 알림 발송 provider 추상화 — 2026-08-03 신설
 *
 * 설계 의도: 발송 업체(알리고·솔라피·NHN Toast·SMTP …)에 코드가 묶이지 않게 한다.
 * 업체는 계약·단가에 따라 바뀐다. 바뀔 때 **이 파일의 구현체 하나만 갈아끼우면** 되게 했다.
 *
 * 지금 기본값은 LogProvider — 실제로 보내지 않고 기록만 한다.
 * 덕분에 **업체 계약 전에도 알림 흐름 전체를 테스트할 수 있다**
 * (어떤 시점에 어떤 문구가 나가는지 관리자에서 확인 가능).
 */

export type NotificationChannel = "sms" | "kakao" | "email"

export type SendInput = {
  channel: NotificationChannel
  /** 수신처 — 전화번호 또는 이메일 */
  to: string
  title?: string | null
  body: string
}

export type SendResult = {
  /** "sent" = 실제 발송, "logged" = 기록만(미연동) */
  status: "sent" | "logged" | "failed"
  error?: string
}

export interface NotificationProvider {
  readonly name: string
  send(input: SendInput): Promise<SendResult>
}

/**
 * 기본 provider — 실제 발송 없이 기록만 한다.
 *
 * 이 상태에서도 알림 로그가 쌓이므로 "어떤 주문에 무슨 알림이 나갔어야 하는지"를
 * 관리자에서 볼 수 있다. 업체 연동 후에는 status 가 "logged" → "sent" 로 바뀐다.
 */
export class LogProvider implements NotificationProvider {
  readonly name = "log"
  async send(input: SendInput): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info(
      `[notification:log] ${input.channel} → ${maskRecipient(input.to)} : ${input.body.slice(0, 60)}`
    )
    return { status: "logged" }
  }
}

/** 로그에 수신처를 통째로 남기지 않는다(개인정보 최소화). */
export function maskRecipient(to: string): string {
  if (to.includes("@")) {
    const [id, domain] = to.split("@")
    return `${id.slice(0, 2)}***@${domain}`
  }
  const digits = to.replace(/\D/g, "")
  if (digits.length >= 8) return `${digits.slice(0, 3)}****${digits.slice(-4)}`
  return "***"
}

/**
 * provider 선택 — 환경변수로 갈아끼운다.
 *
 *   NOTIFICATION_PROVIDER=log   (기본) 기록만
 *
 * 업체 연동 시 여기에 구현체를 추가하고 분기만 늘리면 된다.
 * 구현해야 할 것은 `send()` 하나뿐이다.
 *
 * 예시(연동 시):
 *   case "aligo":  return new AligoProvider(process.env.ALIGO_API_KEY!, ...)
 *   case "solapi": return new SolapiProvider(...)
 */
export function resolveProvider(): NotificationProvider {
  const kind = (process.env.NOTIFICATION_PROVIDER ?? "log").toLowerCase()
  switch (kind) {
    case "log":
    default:
      return new LogProvider()
  }
}

/**
 * 알림 발송 기록(NotificationLog) 모델 — 2026-08-03 신설
 *
 * 왜 필요한가: 고객이 "알림을 못 받았다"고 하면 근거가 있어야 한다.
 * 보냈는지 / 언제 / 어떤 문구로 / 실패했다면 왜 를 남긴다. CS 응대의 1차 자료다.
 * append-only — 수정하지 않는다.
 *
 * 개인정보: 수신처(전화번호·이메일)가 저장된다. 보존기간 정책에 따라 정리할 것.
 */
import { model } from "@medusajs/framework/utils"

const NotificationLog = model.define("notification_log", {
  id: model.id({ prefix: "nlog" }).primaryKey(),
  /** 알림 시점 키 — notification_template.event 와 동일 체계 */
  event: model.text().index("IDX_notification_log_event"),
  /** 발송 채널 */
  channel: model.text(),
  /** 수신처(전화번호 또는 이메일) — 개인정보 */
  recipient: model.text(),
  /** 실제로 발송된 제목 */
  title: model.text().nullable(),
  /** 실제로 발송된 본문(변수 치환 완료본) */
  body: model.text(),
  /**
   * 발송 상태
   *  - "sent"    실제 발송 성공
   *  - "logged"  provider 미연동 상태에서 기록만 함(현재 기본)
   *  - "failed"  발송 실패
   *  - "skipped" 템플릿 없음/비활성으로 건너뜀
   */
  status: model.text().index("IDX_notification_log_status"),
  /** 실패 사유 또는 건너뛴 이유 */
  error: model.text().nullable(),
  /** 연관 주문/고객 — 조회 편의 */
  order_id: model.text().nullable(),
  customer_id: model.text().index("IDX_notification_log_customer").nullable(),
})

export default NotificationLog

/**
 * 알림 템플릿(NotificationTemplate) 모델 — 2026-08-03 신설
 *
 * 왜 DB 에 두는가: 알림 문구는 운영하면서 계속 바뀐다("배송이 시작되었습니다" 한 줄도
 * CS 응대에 따라 수시로 다듬는다). 코드에 박아 두면 문구 하나 고치는 데 배포가 필요하다.
 * → 관리자 화면에서 바로 고칠 수 있도록 DB 에 둔다.
 *
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블만 사용.
 */
import { model } from "@medusajs/framework/utils"

const NotificationTemplate = model.define("notification_template", {
  id: model.id({ prefix: "ntpl" }).primaryKey(),
  /**
   * 알림 시점 키 — 예: "order.placed", "order.shipped"
   * 구독자(subscriber)가 이 키로 템플릿을 찾는다.
   */
  event: model.text().index("IDX_notification_template_event"),
  /**
   * 발송 채널 — "sms" | "kakao" | "email"
   * 같은 event 라도 채널별로 문구가 다르다(SMS 는 길이 제한이 있다).
   */
  channel: model.text(),
  /** 사람이 알아볼 이름 — 관리자 목록에 표시 */
  name: model.text(),
  /** 제목(이메일/알림톡용). SMS 는 보통 사용하지 않는다. */
  title: model.text().nullable(),
  /**
   * 본문. {{변수}} 치환을 지원한다.
   * 예: "{{customer_name}}님, 주문 {{order_no}} 이(가) 접수되었습니다."
   */
  body: model.text(),
  /** 이 템플릿이 쓰는 변수 목록(관리자 화면 안내용) — 쉼표 구분 */
  variables: model.text().nullable(),
  /** 비활성화하면 해당 알림을 보내지 않는다(문구 수정 중 임시 중단 등) */
  enabled: model.boolean().default(true),
})

export default NotificationTemplate

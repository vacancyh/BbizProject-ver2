/**
 * 한국형 알림 모듈 — 2026-08-03 신설
 *
 * 배경: 점검 결과 **알림을 보내는 코드가 아예 없었다**(notification 모듈 미설정,
 * 알림 구독자 0건, 발송 호출 0건). SMS 업체와 계약해도 "언제 무엇을 보낼지"부터
 * 새로 만들어야 하는 상태였다.
 *
 * 구성
 *  - notification_template : 알림 시점·채널별 문구(관리자에서 수정 가능)
 *  - notification_log      : 발송 이력(CS 응대 근거)
 *  - provider.ts           : 발송 업체 추상화. 기본은 기록만 하는 LogProvider
 *
 * 지금 상태에서도 **알림 흐름 전체가 동작한다** — 실제 문자만 나가지 않을 뿐,
 * 어떤 주문에 어떤 문구가 나갔어야 하는지 관리자에서 확인할 수 있다.
 * 업체 계약 후에는 provider 구현체 하나만 추가하면 된다.
 *
 * 가드레일: Medusa core 미수정. 전용 테이블 2개만 사용.
 */
import { Module } from "@medusajs/framework/utils"
import NotificationKrModuleService from "./service"

export const NOTIFICATION_KR_MODULE = "notificationKr"

export default Module(NOTIFICATION_KR_MODULE, {
  service: NotificationKrModuleService,
})

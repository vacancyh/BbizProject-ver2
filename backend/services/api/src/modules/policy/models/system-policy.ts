/**
 * 시스템 정책(SystemPolicy) 모델 — system_policies 통합 저장소.
 *
 * 출처: 관리자_설계.md §5.3 (정책 저장소 통합 + 변경 이중확인 + 변경이력)
 *  - key      = 정책 식별자(유일, 예: order.auto_cancel_hours)
 *  - value    = 정책 값(json — 문자열/숫자/불리언 등)
 *  - value_type = FE 입력 위젯 결정용(string/number/boolean)
 *  - category = 묶음 분류(주문/환불/적립 등)
 *  - 변경 시 PolicyHistory 자동 적재 + 감사 로그 기록(service.set)
 */
import { model } from "@medusajs/framework/utils"

const SystemPolicy = model.define("system_policy", {
  // 정책 행 고유 id (prefix = pol)
  id: model.id({ prefix: "pol" }).primaryKey(),
  // 정책 키(유일)
  key: model.text().unique(),
  // 한글 표시명
  label: model.text(),
  // 분류(주문/환불/적립/보안 등)
  category: model.text().default("general"),
  // 정책 값(json)
  value: model.json(),
  // 값 타입(FE 입력 위젯: string/number/boolean)
  value_type: model.text().default("string"),
  // 설명
  description: model.text().nullable(),
  // 최종 변경자 user.id
  updated_by: model.text().nullable(),
})

export default SystemPolicy

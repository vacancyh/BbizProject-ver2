/**
 * 감사 로그(AuditLog) 모델 — append-only.
 *
 * 출처: 관리자_설계.md §5.2 / 쇼핑몰_전용_QA_v4.md ADM-S
 *  - 모든 write 액션 1건 기록(생성만, 수정/삭제 금지 → service 가 update/delete 미노출)
 *  - 5년 보관(만료분 아카이브는 후속 jobs 영역)
 *  - PII(전화/주민번호/이메일/주소)는 저장 전 마스킹(utils/mask-pii)
 */
import { model } from "@medusajs/framework/utils"

const AuditLog = model.define("audit_log", {
  // 로그 고유 id (prefix = alog)
  id: model.id({ prefix: "alog" }).primaryKey(),
  // 행위자 Medusa user.id (미인증 시 null)
  actor_id: model.text().index("IDX_audit_log_actor_id").nullable(),
  // 행위자 이메일(조회 편의, 마스킹 적용)
  actor_email: model.text().nullable(),
  // 액션 한글 라벨 (예: "권한 변경", "정책 변경")
  action: model.text(),
  // HTTP 메서드
  method: model.text(),
  // 요청 경로
  path: model.text(),
  // 대상 유형(예: user/policy, 선택)
  target_type: model.text().nullable(),
  // 대상 id(선택)
  target_id: model.text().nullable(),
  // 응답 상태 코드
  status_code: model.number(),
  // 변경 내용(요청 본문 등, PII 마스킹 후)
  diff: model.json().nullable(),
  // 요청 IP
  ip: model.text().nullable(),
})

export default AuditLog

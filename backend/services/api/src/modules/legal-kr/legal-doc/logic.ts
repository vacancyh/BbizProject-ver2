/**
 * 약관 관리 순수 로직 모듈 — DB·MedusaService 의존 없음.
 *
 * service.ts 는 DB 입출력만 담당하고, 버전 유효성 검증 및 상태 전이 판정 로직은 여기에 위임한다.
 *
 * export 함수 목록:
 *  - isValidBodyInput(body): boolean
 *      약관 본문 입력 유효성 검증 (1자 이상).
 *  - isValidEffectiveDate(effectiveAt): boolean
 *      시행일 유효성 검증 (오늘 이후).
 *  - isPublishable(status): boolean
 *      draft 상태인 경우만 게시 가능.
 *  - isDirectEditBlocked(status): boolean
 *      published/archived 상태는 직접 수정 차단(true).
 *  - buildConsentTriggerPayload(docId, type, version): ConsentTriggerPayload
 *      동의 재요청 트리거 페이로드 생성.
 */

import type { LegalDocStatus, LegalDocType } from "./models/legal-doc"

// ─── 타입 ───────────────────────────────────────────────────────────────────

/** 동의 재요청 트리거 페이로드 (d5 t008 동의이력 연동) */
export interface ConsentTriggerPayload {
  /** 약관 문서 id */
  legal_doc_id: string
  /** 약관 종류 */
  type: LegalDocType
  /** 버전 문자열 */
  version: string
  /** 트리거 생성 일시 */
  triggered_at: Date
}

// ─── 순수 함수 ───────────────────────────────────────────────────────────────

/**
 * 약관 본문 유효성 검증.
 *
 * @param body 입력 본문 문자열
 * @returns 1자 이상이면 true, 그 외 false
 */
export function isValidBodyInput(body: unknown): boolean {
  return typeof body === "string" && body.trim().length > 0
}

/**
 * 시행일 유효성 검증.
 *
 * t008 §4 I2: 오늘 이후만 허용.
 * "오늘"을 포함 (오늘 00:00:00 ~ 이후 = 허용).
 *
 * @param effectiveAt 시행 예정 Date
 * @param now 현재 시각 (테스트 주입용, 기본 = new Date())
 * @returns 오늘 이후이면 true
 */
export function isValidEffectiveDate(
  effectiveAt: Date,
  now: Date = new Date()
): boolean {
  // 날짜만 비교 (시각 무시): effectiveAt 의 자정 >= now 의 자정
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const effectiveMidnight = new Date(
    effectiveAt.getFullYear(),
    effectiveAt.getMonth(),
    effectiveAt.getDate()
  )
  return effectiveMidnight.getTime() >= todayMidnight.getTime()
}

/**
 * 게시 가능 여부 판정.
 *
 * draft 상태인 경우에만 게시(published) 전이가 허용된다.
 *
 * @param status 현재 문서 상태
 * @returns draft 이면 true
 */
export function isPublishable(status: LegalDocStatus): boolean {
  return status === "draft"
}

/**
 * 게시본 직접 수정 차단 판정.
 *
 * t008 §3 S1: 게시본(published) 직접 수정 금지 → 새 버전 강제.
 * archived 도 동일하게 차단.
 *
 * @param status 현재 문서 상태
 * @returns published 또는 archived 이면 true (= 차단해야 함)
 */
export function isDirectEditBlocked(status: LegalDocStatus): boolean {
  return status === "published" || status === "archived"
}

/**
 * 동의 재요청 트리거 페이로드 생성.
 *
 * t008 §8 C1: 필수 약관(requires_consent=true) 개정 시 동의 재요청 연동(d5 t008).
 * 본 함수는 트리거 데이터를 순수하게 생성하고, 실제 전송은 service.ts 가 담당한다.
 *
 * @param docId 약관 문서 id
 * @param type 약관 종류
 * @param version 버전 문자열
 * @returns ConsentTriggerPayload
 */
export function buildConsentTriggerPayload(
  docId: string,
  type: LegalDocType,
  version: string
): ConsentTriggerPayload {
  return {
    legal_doc_id: docId,
    type,
    version,
    triggered_at: new Date(),
  }
}

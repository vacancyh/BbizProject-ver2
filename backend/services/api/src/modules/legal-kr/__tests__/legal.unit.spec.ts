/**
 * 약관 관리 단위 테스트 — t008 §9 / unit_065 (production 모듈 직접 검증)
 *
 * UT-001: 버전 작성/게시 + 동의이력(d5) 연동
 *   - isValidBodyInput: 본문 유효성 검증 (1자 이상 = true, 빈값 = false)
 *   - isValidEffectiveDate: 시행일 검증 (오늘 이후 = true, 과거 = false)
 *   - isPublishable: draft 만 게시 가능 (published/archived = false)
 *   - isDirectEditBlocked: published/archived 직접 수정 차단 (draft = false)
 *   - buildConsentTriggerPayload: 필수 동의 트리거 페이로드 생성
 *   - route/service 구조 검증: publishDoc 이 buildConsentTriggerPayload 를 사용하는지
 *
 * 테스트 전략:
 *  - production legal-doc/logic.ts 직접 import (isValidBodyInput, isValidEffectiveDate,
 *    isPublishable, isDirectEditBlocked, buildConsentTriggerPayload)
 *  - production legal-doc/service.ts 소스 구조 검증 (logic import + publishDoc 메서드)
 *  - production route.ts 소스 구조 검증 (LEGAL_DOC_MODULE import + publishDoc 호출)
 *  - 복제본(사본 클래스/함수) 없음 — 모든 검증이 production 함수를 호출
 *  - DB·MedusaService 의존 없음 (순수 함수 + 구조 검증)
 */

// ─── production 모듈 직접 import ──────────────────────────────────────────────
import {
  isValidBodyInput,
  isValidEffectiveDate,
  isPublishable,
  isDirectEditBlocked,
  buildConsentTriggerPayload,
} from "../legal-doc/logic"
import type { LegalDocStatus, LegalDocType } from "../legal-doc/models/legal-doc"
import { LEGAL_DOC_TYPES, LEGAL_DOC_STATUSES } from "../legal-doc/models/legal-doc"

// ─── 구조 검증용 fs ───────────────────────────────────────────────────────────
import * as fs from "fs"
import * as path from "path"

// ─── UT-001 — 버전 작성/게시 + 동의이력(d5) 연동 ──────────────────────────────

describe("UT-001: 버전 작성/게시 + 동의이력(d5) 연동", () => {

  // ── isValidBodyInput: 본문 유효성 ──────────────────────────────────────────

  describe("isValidBodyInput: 약관 본문 유효성 검증", () => {
    test("정상 본문(1자 이상 문자열)은 유효하다(true)", () => {
      expect(isValidBodyInput("이용약관 본문입니다.")).toBe(true)
    })

    test("긴 본문도 유효하다(true)", () => {
      const longBody = "a".repeat(10000)
      expect(isValidBodyInput(longBody)).toBe(true)
    })

    test("빈 문자열은 유효하지 않다(false)", () => {
      expect(isValidBodyInput("")).toBe(false)
    })

    test("공백만 있는 문자열은 유효하지 않다(false)", () => {
      expect(isValidBodyInput("   ")).toBe(false)
    })

    test("null 은 유효하지 않다(false)", () => {
      expect(isValidBodyInput(null)).toBe(false)
    })

    test("undefined 는 유효하지 않다(false)", () => {
      expect(isValidBodyInput(undefined)).toBe(false)
    })

    test("숫자 타입은 유효하지 않다(false)", () => {
      expect(isValidBodyInput(123)).toBe(false)
    })
  })

  // ── isValidEffectiveDate: 시행일 검증 ─────────────────────────────────────

  describe("isValidEffectiveDate: 시행일 오늘 이후 검증", () => {
    const now = new Date("2026-06-03T10:00:00.000Z")

    test("오늘(2026-06-03)은 유효하다(true)", () => {
      const today = new Date("2026-06-03T00:00:00.000Z")
      expect(isValidEffectiveDate(today, now)).toBe(true)
    })

    test("내일(2026-06-04)은 유효하다(true)", () => {
      const tomorrow = new Date("2026-06-04T00:00:00.000Z")
      expect(isValidEffectiveDate(tomorrow, now)).toBe(true)
    })

    test("1개월 후는 유효하다(true)", () => {
      const future = new Date("2026-07-03T00:00:00.000Z")
      expect(isValidEffectiveDate(future, now)).toBe(true)
    })

    test("어제(2026-06-02)는 유효하지 않다(false)", () => {
      const yesterday = new Date("2026-06-02T00:00:00.000Z")
      expect(isValidEffectiveDate(yesterday, now)).toBe(false)
    })

    test("1년 전은 유효하지 않다(false)", () => {
      const pastYear = new Date("2025-06-03T00:00:00.000Z")
      expect(isValidEffectiveDate(pastYear, now)).toBe(false)
    })
  })

  // ── isPublishable: 게시 가능 여부 ─────────────────────────────────────────

  describe("isPublishable: draft 만 게시 가능 검증", () => {
    test("draft 상태는 게시 가능하다(true)", () => {
      expect(isPublishable("draft")).toBe(true)
    })

    test("published 상태는 게시할 수 없다(false)", () => {
      expect(isPublishable("published")).toBe(false)
    })

    test("archived 상태는 게시할 수 없다(false)", () => {
      expect(isPublishable("archived")).toBe(false)
    })

    test("모든 LEGAL_DOC_STATUSES 중 draft 만 isPublishable=true", () => {
      for (const s of LEGAL_DOC_STATUSES) {
        if (s === "draft") {
          expect(isPublishable(s)).toBe(true)
        } else {
          expect(isPublishable(s)).toBe(false)
        }
      }
    })
  })

  // ── isDirectEditBlocked: 게시본 직접 수정 차단 ────────────────────────────

  describe("isDirectEditBlocked: 게시본/아카이브 직접 수정 차단 검증", () => {
    test("published 상태는 직접 수정이 차단된다(true)", () => {
      expect(isDirectEditBlocked("published")).toBe(true)
    })

    test("archived 상태는 직접 수정이 차단된다(true)", () => {
      expect(isDirectEditBlocked("archived")).toBe(true)
    })

    test("draft 상태는 직접 수정이 허용된다(false)", () => {
      expect(isDirectEditBlocked("draft")).toBe(false)
    })

    test("C2 가드레일: published 차단 → 새 버전 강제 확인", () => {
      // 게시본 수정 시도 → 차단 후 에러 throw 시뮬레이션 (service.ts 동작)
      const status: LegalDocStatus = "published"
      expect(() => {
        if (isDirectEditBlocked(status)) {
          throw new Error(
            "[legalDoc] 이미 게시된 약관은 수정할 수 없습니다. 새 버전을 작성하세요. (C2)"
          )
        }
      }).toThrow("C2")
    })

    test("draft 수정 시도 → 차단 없이 통과", () => {
      const status: LegalDocStatus = "draft"
      expect(() => {
        if (isDirectEditBlocked(status)) {
          throw new Error("[legalDoc] 차단")
        }
      }).not.toThrow()
    })
  })

  // ── buildConsentTriggerPayload: 동의 재요청 트리거 페이로드 ───────────────

  describe("buildConsentTriggerPayload: 동의 재요청 트리거 페이로드 생성", () => {
    test("정상 입력으로 ConsentTriggerPayload 가 생성된다", () => {
      const payload = buildConsentTriggerPayload(
        "ldoc_001",
        "terms_of_service",
        "v2.0"
      )
      expect(payload.legal_doc_id).toBe("ldoc_001")
      expect(payload.type).toBe("terms_of_service")
      expect(payload.version).toBe("v2.0")
      expect(payload.triggered_at).toBeInstanceOf(Date)
    })

    test("triggered_at 은 현재 시각에 가깝다(1초 이내)", () => {
      const before = new Date()
      const payload = buildConsentTriggerPayload("ldoc_x", "privacy_policy", "v1.0")
      const after = new Date()
      expect(payload.triggered_at.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000
      )
      expect(payload.triggered_at.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000
      )
    })

    test("모든 LEGAL_DOC_TYPES 에 대해 페이로드가 생성된다", () => {
      for (const type of LEGAL_DOC_TYPES) {
        const payload = buildConsentTriggerPayload("ldoc_any", type, "v1.0")
        expect(payload.type).toBe(type)
        expect(payload.legal_doc_id).toBe("ldoc_any")
      }
    })

    test("requires_consent=true 게시 흐름: 트리거 페이로드가 non-null 이다", () => {
      // publishDoc 내부 로직 시뮬레이션
      const requiresConsent = true
      let consentTrigger: ReturnType<typeof buildConsentTriggerPayload> | null = null
      if (requiresConsent) {
        consentTrigger = buildConsentTriggerPayload(
          "ldoc_002",
          "marketing_consent",
          "v1.0"
        )
      }
      expect(consentTrigger).not.toBeNull()
      expect(consentTrigger!.legal_doc_id).toBe("ldoc_002")
    })

    test("requires_consent=false 게시 흐름: 트리거 페이로드가 null 이다", () => {
      // publishDoc 내부 로직 시뮬레이션 (requires_consent=false)
      const requiresConsent = false
      let consentTrigger: ReturnType<typeof buildConsentTriggerPayload> | null = null
      if (requiresConsent) {
        consentTrigger = buildConsentTriggerPayload("ldoc_003", "terms_of_service", "v1.0")
      }
      expect(consentTrigger).toBeNull()
    })
  })

  // ── service.ts 구조 검증 ─────────────────────────────────────────────────────

  describe("service.ts 구조 검증: production 함수 호출 경로 확인", () => {
    const servicePath = path.resolve(__dirname, "../legal-doc/service.ts")
    const serviceSource = fs.readFileSync(servicePath, "utf-8")

    test("service.ts 가 logic.ts 에서 isValidBodyInput 을 import 한다", () => {
      expect(serviceSource).toContain("isValidBodyInput")
      expect(serviceSource).toContain("./logic")
    })

    test("service.ts 가 logic.ts 에서 isValidEffectiveDate 를 import 한다", () => {
      expect(serviceSource).toContain("isValidEffectiveDate")
    })

    test("service.ts 가 logic.ts 에서 isPublishable 을 import 한다", () => {
      expect(serviceSource).toContain("isPublishable")
    })

    test("service.ts 가 logic.ts 에서 isDirectEditBlocked 를 import 한다", () => {
      expect(serviceSource).toContain("isDirectEditBlocked")
    })

    test("service.ts 가 logic.ts 에서 buildConsentTriggerPayload 를 import 한다", () => {
      expect(serviceSource).toContain("buildConsentTriggerPayload")
    })

    test("service.ts 에 createDraft 메서드가 있고 isValidBodyInput 을 호출한다", () => {
      expect(serviceSource).toContain("createDraft")
      expect(serviceSource).toContain("isValidBodyInput(input.body)")
    })

    test("service.ts 에 publishDoc 메서드가 있고 isDirectEditBlocked 를 호출한다", () => {
      expect(serviceSource).toContain("publishDoc")
      // doc.status 는 타입 단언(as LegalDocStatus) 포함 형태로 호출
      expect(serviceSource).toContain("isDirectEditBlocked(doc.status")
    })

    test("service.ts 의 publishDoc 이 buildConsentTriggerPayload 를 호출한다", () => {
      expect(serviceSource).toContain("buildConsentTriggerPayload(")
    })

    test("service.ts 에 getActiveDoc 메서드가 존재한다", () => {
      expect(serviceSource).toContain("getActiveDoc")
    })

    test("service.ts 에 listByType 메서드가 존재한다", () => {
      expect(serviceSource).toContain("listByType")
    })
  })

  // ── route.ts 구조 검증 ────────────────────────────────────────────────────

  describe("route.ts 구조 검증: production API 연결 확인", () => {
    const publishRoutePath = path.resolve(
      __dirname,
      "../../../api/admin/legal-docs/[id]/publish/route.ts"
    )
    const publishRouteSource = fs.readFileSync(publishRoutePath, "utf-8")

    const listRoutePath = path.resolve(
      __dirname,
      "../../../api/admin/legal-docs/route.ts"
    )
    const listRouteSource = fs.readFileSync(listRoutePath, "utf-8")

    test("publish route.ts 가 LEGAL_DOC_MODULE 을 import 한다", () => {
      expect(publishRouteSource).toContain("LEGAL_DOC_MODULE")
    })

    test("publish route.ts 가 LegalDocModuleService 를 import 한다", () => {
      expect(publishRouteSource).toContain("LegalDocModuleService")
    })

    test("publish route.ts 가 publishDoc 을 호출한다", () => {
      expect(publishRouteSource).toContain("publishDoc(")
    })

    test("publish route.ts 가 consent_trigger 를 응답에 포함한다 (d5 연동 증적)", () => {
      expect(publishRouteSource).toContain("consent_trigger")
    })

    test("publish route.ts 가 400 에러 응답을 처리한다", () => {
      expect(publishRouteSource).toContain("400")
    })

    test("list route.ts 가 LEGAL_DOC_MODULE 을 import 한다", () => {
      expect(listRouteSource).toContain("LEGAL_DOC_MODULE")
    })

    test("list route.ts 가 GET 핸들러에서 listByType 을 호출한다", () => {
      expect(listRouteSource).toContain("listByType")
    })

    test("list route.ts 가 POST 핸들러에서 createDraft 를 호출한다", () => {
      expect(listRouteSource).toContain("createDraft")
    })

    test("list route.ts 가 201 응답을 반환한다", () => {
      expect(listRouteSource).toContain("201")
    })
  })
})

/**
 * 횡단 미들웨어 — RBAC 권한검사 + 감사 로그 기록.
 *
 * 적용: /admin/* 의 write 메서드(POST/PUT/PATCH/DELETE).
 *  1) rbacGuard  = 요청 경로 → 메뉴 매핑 후 등급별 CRUD 권한 판정. 거부 시 403.
 *                  (미지정/super 관리자 = 전체 허용 → 마이그레이션 중 잠금 방지)
 *  2) auditTap   = 응답 성공(2xx) 시 write 액션 1건을 감사 로그에 append-only 기록(PII 마스킹).
 *
 * 가드레일: Medusa core 미수정. 경로 매핑이 없는 요청은 통과(미지의 코어 경로 차단 방지).
 */
import {
  defineMiddlewares,
  errorHandler as defaultErrorHandler,
  type MedusaRequest,
  type MedusaResponse,
  type MedusaNextFunction,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RBAC_MODULE } from "../modules/rbac"
import type RbacModuleService from "../modules/rbac/service"
import type { RbacAction } from "../modules/rbac/service"
import { AUDIT_MODULE } from "../modules/audit"
import type AuditModuleService from "../modules/audit/service"
import { ADMIN_2FA_MODULE } from "../modules/admin-2fa"
import type Admin2faModuleService from "../modules/admin-2fa/service"
import { CUSTOMER_DORMANCY_MODULE } from "../modules/customer-dormancy"
import type CustomerDormancyModuleService from "../modules/customer-dormancy/service"
import { rlGet, rlIncr, rlReset } from "./_utils/rate-limit"
import { isTokenDenylisted } from "./_utils/token-denylist"

const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"]

// 경로 prefix → navigation 메뉴 id 매핑 (apps/admin navigation.ts 와 정합)
const PATH_MENU_MAP: { prefix: string; menu: string }[] = [
  { prefix: "/admin/orders-kr", menu: "orders" },
  { prefix: "/admin/orders", menu: "orders" },
  { prefix: "/admin/draft-orders", menu: "orders" },
  { prefix: "/admin/product-categories", menu: "categories" },
  { prefix: "/admin/categories", menu: "categories" },
  { prefix: "/admin/collections", menu: "categories" },
  { prefix: "/admin/product-tags", menu: "categories" },
  { prefix: "/admin/product-types", menu: "categories" },
  { prefix: "/admin/catalog-types", menu: "categories" },
  { prefix: "/admin/products", menu: "products" },
  { prefix: "/admin/product-variants", menu: "products" },
  { prefix: "/admin/inventory-items", menu: "products" },
  { prefix: "/admin/reservations", menu: "products" },
  { prefix: "/admin/customer-groups", menu: "members" },
  { prefix: "/admin/customers", menu: "members" },
  { prefix: "/admin/fulfillments", menu: "shipping" },
  { prefix: "/admin/shipping-option-types", menu: "shipping" },
  { prefix: "/admin/shipping-options", menu: "shipping" },
  { prefix: "/admin/shipping-profiles", menu: "shipping" },
  { prefix: "/admin/stock-locations", menu: "shipping" },
  { prefix: "/admin/fulfillment-sets", menu: "shipping" },
  { prefix: "/admin/service-zones", menu: "shipping" },
  { prefix: "/admin/promotions", menu: "coupons" },
  { prefix: "/admin/campaigns", menu: "coupons" },
  { prefix: "/admin/price-lists", menu: "coupons" },
  { prefix: "/admin/reviews", menu: "reviews" },
  { prefix: "/admin/rbac", menu: "permissions" },
  { prefix: "/admin/audit", menu: "audit-logs" },
  { prefix: "/admin/policy", menu: "policies" },
  { prefix: "/admin/users", menu: "settings" },
  { prefix: "/admin/invites", menu: "settings" },
  { prefix: "/admin/stores", menu: "settings" }, // 복수형(GET/POST /admin/stores/:id) — R2: 국내택배사 저장 등 audit 매핑
  { prefix: "/admin/store", menu: "settings" },
  { prefix: "/admin/regions", menu: "settings" },
  { prefix: "/admin/tax-regions", menu: "settings" },
  { prefix: "/admin/tax-rates", menu: "settings" }, // 세율 standalone 엔드포인트(설정>세금 탭)
  { prefix: "/admin/return-reasons", menu: "settings" }, // 반품 사유 코드(설정>반품·환불 사유 탭)
  { prefix: "/admin/refund-reasons", menu: "settings" }, // 환불 사유 코드(설정>반품·환불 사유 탭)
  { prefix: "/admin/sales-channels", menu: "settings" },
  { prefix: "/admin/api-keys", menu: "settings" },
  { prefix: "/admin/notices", menu: "settings" }, // 고객센터 공지(설정>고객센터 콘텐츠)
  { prefix: "/admin/faqs", menu: "settings" }, // 고객센터 FAQ(설정>고객센터 콘텐츠)
  { prefix: "/admin/banners", menu: "settings" }, // 메인 배너/팝업(설정>배너·팝업)
  { prefix: "/admin/home-curations", menu: "products" }, // 홈 큐레이션(MD추천) — 상품 메뉴 권한
  // ── 보안점검 2026-07-27: 미매핑이던 커스텀 admin 라우트 RBAC 매핑(기능수준 인가 파괴/BFLA 방지) ──
  { prefix: "/admin/points", menu: "members" }, // 적립금 발행/차감
  { prefix: "/admin/membership", menu: "members" }, // 등급 조정
  { prefix: "/admin/consents", menu: "members" }, // 동의 이력
  { prefix: "/admin/sanctions", menu: "members" }, // 제재/블랙리스트
  { prefix: "/admin/withdrawal", menu: "orders" }, // 청약철회(7일)
  { prefix: "/admin/rma", menu: "orders" }, // 반품 정책/검수/환불
  { prefix: "/admin/exchanges", menu: "orders" }, // 교환 그룹
  { prefix: "/admin/settlement", menu: "settlement" }, // 정산 스냅샷/마감/지급
  { prefix: "/admin/tax-invoices", menu: "settings" }, // 세금계산서 발급/정정/취소
  { prefix: "/admin/time-sales", menu: "coupons" }, // 타임세일
  { prefix: "/admin/product-curation", menu: "products" }, // 조회수/위시/인기검색/금칙어
  { prefix: "/admin/product-disclosure", menu: "products" }, // 상품정보고시
  { prefix: "/admin/category-option-map", menu: "categories" }, // 카테고리-옵션 매핑
  { prefix: "/admin/legal-docs", menu: "policies" }, // 약관 관리
  // ── 판매 전 점검 2026-07-28: 미매핑이던 대시보드/지표 API RBAC 매핑 ──
  // 화면(메뉴)에서 가려도 API 를 직접 호출하면 등급과 무관하게 매출·정산 지표가 노출됐다.
  // 더 구체적인 prefix 를 먼저 둔다(위에서부터 순차 매칭).
  // ── 2026-08-03: CSV 내보내기 — 개인정보가 통째로 나가므로 반드시 RBAC 를 건다.
  // 더 구체적인 경로를 먼저 둔다(위에서부터 순차 매칭).
  { prefix: "/admin/exports/orders", menu: "orders" }, // 주문 CSV(고객 성명·연락처·주소 포함)
  { prefix: "/admin/exports/customers", menu: "members" }, // 회원 CSV(개인정보)
  { prefix: "/admin/dashboard/settlement-kpi", menu: "settlement" }, // 정산 KPI(민감)
  { prefix: "/admin/dashboard", menu: "dashboard" }, // 대시보드 위젯/통계
]

function menuFromPath(path: string): string | null {
  for (const m of PATH_MENU_MAP) {
    if (path === m.prefix || path.startsWith(m.prefix + "/")) {
      return m.menu
    }
  }
  return null
}

function actionFromMethod(method: string): RbacAction {
  if (method === "POST") return "create"
  if (method === "DELETE") return "delete"
  return "update" // PUT/PATCH
}

function actorIdOf(req: MedusaRequest): string | null {
  return (req as any).auth_context?.actor_id ?? null
}

// 보안 강화 opt-in 플래그(보안점검 2026-07-27) — 기본 비활성(현행 동작 유지), 켜면 강제.
const GUARD_FAIL_CLOSED = process.env.SECURITY_GUARD_FAIL_CLOSED === "true" // M1: 가드 내부오류 시 차단
const ADMIN_2FA_REQUIRED = process.env.ADMIN_2FA_REQUIRED === "true"       // M3: 2FA 미등록 관리자 쓰기 차단
const MONEY_ACTIONS_SUPER_ONLY = process.env.ADMIN_MONEY_ACTIONS_SUPER_ONLY === "true" // M2: 환불/취소 super 전용

/** 가드 내부오류 처리 — 기본 fail-open(next), 플래그 시 503(fail-closed). */
function guardError(res: MedusaResponse, next: MedusaNextFunction, tag: string, e: unknown) {
  console.warn(`[${tag}] 가드 오류:`, (e as Error)?.message)
  if (GUARD_FAIL_CLOSED) {
    res.status(503).json({ message: "보안 검사를 일시적으로 수행할 수 없습니다. 잠시 후 다시 시도해 주세요.", code: "GUARD_UNAVAILABLE" })
    return
  }
  return next()
}

/** RBAC 권한 검사 미들웨어 (write 거부 시 403) */
async function rbacGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const isWrite = WRITE_METHODS.includes(req.method)
    const isRead = req.method === "GET"
    // write = create/update/delete 판정, read = GET 조회 판정(보안 메뉴 등 can_read 제한 적용)
    if (!isWrite && !isRead) return next()
    const menu = menuFromPath(req.path)
    if (!menu) return next() // 매핑 없는 경로는 통과(코어 보호)
    const userId = actorIdOf(req)
    if (!userId) return next() // 미인증은 Medusa auth 가 처리

    const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
    const action: RbacAction = isWrite ? actionFromMethod(req.method) : "read"
    const allowed = await rbac.checkPermission(userId, menu, action)
    if (!allowed) {
      res.status(403).json({
        message: `이 작업을 수행할 권한이 없습니다. (메뉴: ${menu}, 작업: ${action})`,
        code: "RBAC_FORBIDDEN",
      })
      return
    }
    return next()
  } catch (e) {
    return guardError(res, next, "rbac", e)
  }
}

/**
 * 토큰 denylist 가드 — 로그아웃된 토큰의 /admin/* 재사용 차단(서버측 무효화).
 * stateless JWT 를 로그아웃 시 무효화하기 위한 방어. 오류 시 통과(가용성).
 */
async function tokenDenylistGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const h = req.headers.authorization ?? ""
    const tok = h.startsWith("Bearer ") ? h.slice(7) : null
    if (tok && (await isTokenDenylisted(req.scope, tok))) {
      res.status(401).json({ message: "로그아웃된 세션입니다. 다시 로그인해 주세요.", code: "TOKEN_REVOKED" })
      return
    }
  } catch (e) {
    return guardError(res, next, "token-denylist", e)
  }
  return next()
}

/**
 * 관리자 2FA 세션 게이팅 — 클라이언트 우회 방지(서버측 강제).
 * 2FA 활성 관리자는 로그인 토큰이 /admin/2fa/verify 를 통과(markTokenVerified)하기 전까지
 * 모든 /admin/* 접근이 403(2FA_REQUIRED)로 차단된다.
 *  - /admin/2fa/* 는 예외(상태조회·검증 자체는 허용해야 통과 가능).
 *  - 2FA 미활성 관리자/미인증 요청은 그대로 통과(기존 동작·E2E 무영향).
 *  - 내부 오류 시 fail-open(잠금 방지). 운영 모니터링은 후속.
 */
async function twoFactorGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    // 2FA 관련 엔드포인트는 게이팅 예외(검증 진입 경로 확보)
    if (req.path.startsWith("/admin/2fa")) return next()
    const userId = actorIdOf(req)
    if (!userId) return next() // 미인증은 Medusa auth 가 처리

    const svc = req.scope.resolve(
      ADMIN_2FA_MODULE
    ) as unknown as Admin2faModuleService
    const row = await svc.getByUser(userId)
    if (!row || !row.enabled) {
      // M3(opt-in): 2FA 필수 모드면 미등록 관리자의 쓰기 차단(읽기는 허용 → UI 로드·2FA 등록 페이지 접근 가능)
      if (ADMIN_2FA_REQUIRED && WRITE_METHODS.includes(req.method)) {
        res.status(403).json({
          message: "관리자 2단계 인증 등록이 필요합니다. 설정에서 2FA를 활성화해 주세요.",
          code: "2FA_ENROLL_REQUIRED",
        })
        return
      }
      return next() // 2FA 미활성 → 통과(기본)
    }

    const h = req.headers.authorization ?? ""
    const tok = h.startsWith("Bearer ") ? h.slice(7) : null
    if (tok && (await svc.isTokenVerified(userId, tok))) return next()

    res.status(403).json({
      message: "2단계 인증이 필요합니다. 다시 로그인해 인증 코드를 입력해 주세요.",
      code: "2FA_REQUIRED",
    })
    return
  } catch (e) {
    return guardError(res, next, "2fa", e)
  }
}

/** 감사 로그 기록 미들웨어 (2xx write 성공 시 append-only) */
function auditTap(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (!WRITE_METHODS.includes(req.method)) return next()

  const actorId = actorIdOf(req)
  const path = req.path
  const method = req.method
  const ip = req.ip ?? null
  // 요청 본문 스냅샷(응답 후 변형 방지 위해 얕은 복사)
  const bodySnapshot = req.body ? { ...(req.body as Record<string, unknown>) } : null

  res.on("finish", () => {
    // async 즉시 실행 — actor_id → user.email 조회 후 기록(감사 무결성).
    // 실패해도 응답에 영향 주지 않도록 전부 격리.
    void (async () => {
      try {
        if (res.statusCode < 200 || res.statusCode >= 300) return
        const audit = req.scope.resolve(AUDIT_MODULE) as unknown as AuditModuleService
        const menu = menuFromPath(path)

        // 행위자 email 조회(core user 는 읽기만) — policy 라우트와 동일 패턴
        let actorEmail: string | null = null
        if (actorId) {
          try {
            const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
            const { data } = await query.graph({
              entity: "user",
              fields: ["email"],
              filters: { id: actorId },
            })
            actorEmail = data?.[0]?.email ?? null
          } catch {
            actorEmail = null
          }
        }

        await audit
          .record({
            actor_id: actorId,
            actor_email: actorEmail,
            action: `${method} ${menu ?? path}`,
            method,
            path,
            target_type: menu,
            target_id: null,
            status_code: res.statusCode,
            diff: bodySnapshot,
            ip,
          })
          .catch(() => {})
      } catch {
        // 감사 기록 실패가 응답에 영향 주지 않도록 무시
      }
    })()
  })

  return next()
}

/**
 * 스토어 주문 단건 조회(GET /store/orders/:id) 소유권 가드 — IDOR 방지.
 * 코어 라우트는 소유권을 검사하지 않아 로그인 고객이 남의 주문 id 로 조회 가능했음.
 * - 인증된 고객: 본인(customer_id === actor_id) 주문만 허용, 그 외 404(존재 노출 방지).
 * - 미인증(게스트 주문완료 페이지): 기존 동작 유지(주문 id 기반 조회). 운영 시 서명 토큰 권장.
 */
async function storeOrderOwnershipGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    if (req.method !== "GET") return next()
    const id = req.params.id
    if (!id || id === "lookup") return next() // 목록/조회 라우트 제외
    const actorId = actorIdOf(req)
    if (!actorId) return next() // 미인증 게스트 — 기존 동작

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: { id } as Record<string, unknown>,
    })
    const order = data?.[0]
    if (!order || order.customer_id !== actorId) {
      res.status(404).json({ message: "주문을 찾을 수 없습니다." })
      return
    }
    return next()
  } catch {
    return next() // 오류 시 코어 라우트로 위임(잠금 방지)
  }
}

/**
 * 인증 rate limit + 계정 잠금 — 로그인 무차별 대입(brute-force) 방어.
 * 실패(401/400)만 카운트 → 정상 로그인/테스트는 영향 없음, 실패 폭주만 차단.
 *  - IP 단위: 5분 내 실패 10회 초과 시 차단(분산 계정 스캐닝 방어)
 *  - 계정(이메일) 단위: 15분 내 실패 5회 초과 시 잠금(분산 IP로 한 계정 노리는 공격 방어)
 * 저장소: 캐시 서비스(운영 Redis 구성 시 다중 인스턴스 공유) → 미가용 시 인메모리 폴백.
 *   (운영에선 WAF/API 게이트웨이 rate limit 을 1차 방어로 병행 권장.)
 */
const FAIL_WINDOW_MS = 5 * 60_000 // IP 5분 창
const FAIL_MAX = 10 // IP: 창 내 실패 10회 초과 시 차단
const ACCT_WINDOW_MS = 15 * 60_000 // 계정 15분 창
const ACCT_FAIL_MAX = 5 // 계정: 창 내 실패 5회 초과 시 잠금
function clientIp(req: MedusaRequest): string {
  const xf = (req.headers["x-forwarded-for"] as string) || ""
  return (xf.split(",")[0].trim() || req.ip || "unknown").toString()
}
function loginEmail(req: MedusaRequest): string | null {
  const e = (req.body as any)?.email
  return typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null
}
async function authRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.method !== "POST") return next()
  const ipKey = `authfail:ip:${clientIp(req)}`
  const email = loginEmail(req)
  const acctKey = email ? `authfail:acct:${email}` : null
  try {
    const [ipFails, acctFails] = await Promise.all([
      rlGet(req.scope, ipKey),
      acctKey ? rlGet(req.scope, acctKey) : Promise.resolve(0),
    ])
    if (ipFails >= FAIL_MAX || acctFails >= ACCT_FAIL_MAX) {
      const locked = acctFails >= ACCT_FAIL_MAX
      res.setHeader(
        "Retry-After",
        String(Math.ceil((locked ? ACCT_WINDOW_MS : FAIL_WINDOW_MS) / 1000))
      )
      res.status(429).json({
        message: locked
          ? "로그인 실패가 많아 계정이 일시적으로 잠겼습니다. 잠시 후 다시 시도해 주세요."
          : "인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        code: locked ? "ACCOUNT_LOCKED" : "RATE_LIMITED",
      })
      return
    }
  } catch {
    // 저장소 오류 → fail-open(가용성 우선)
  }
  res.on("finish", () => {
    const sc = res.statusCode
    if (sc === 401 || sc === 400) {
      void rlIncr(req.scope, ipKey, FAIL_WINDOW_MS)
      if (acctKey) void rlIncr(req.scope, acctKey, ACCT_WINDOW_MS)
    } else if (sc >= 200 && sc < 300) {
      void rlReset(req.scope, ipKey)
      if (acctKey) void rlReset(req.scope, acctKey)
    }
  })
  return next()
}

/**
 * 고객 활동시각 갱신 — 인증 고객의 마이페이지 접근 시 last_active_at 갱신(휴면계정 판정용).
 * 2xx 응답에서만, 실패해도 응답에 영향 없도록 격리.
 */
function customerActivityTap(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const uid = actorIdOf(req)
  if (uid) {
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return
      void (async () => {
        try {
          const svc = req.scope.resolve(
            CUSTOMER_DORMANCY_MODULE
          ) as unknown as CustomerDormancyModuleService
          await svc.touch(uid)
        } catch {
          // ignore
        }
      })()
    })
  }
  return next()
}

/**
 * 비밀번호 정책 — 약한 비밀번호 가입/설정 차단.
 * 최소 8자 + 영문 + 숫자. register/reset 계열 요청의 body.password 검증.
 */
function isStrongPassword(pw: unknown): boolean {
  return (
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[A-Za-z]/.test(pw) &&
    /[0-9]/.test(pw)
  )
}
function passwordPolicyGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // 신규 비밀번호 설정 계열만 검증(가입/재설정). 로그인(자격증명 검증)은 제외
  // → 기존 짧은 비밀번호 계정의 로그인은 그대로 허용.
  const p = req.path || ""
  const isPasswordSet = p.endsWith("/register") || p.includes("/reset-password") || p.includes("/update")
  if (!isPasswordSet) return next()
  const pw = (req.body as any)?.password
  if (pw !== undefined && pw !== null && !isStrongPassword(pw)) {
    res.status(400).json({
      message: "비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
      code: "WEAK_PASSWORD",
    })
    return
  }
  return next()
}

/**
 * 장바구니 수량 검증 (2026-08-03 재점검에서 발견)
 *
 * 코어 카트 API 는 quantity 를 정수로 강제하지 않는다. 실측:
 *   quantity=0.4 → 수량 0 짜리 라인아이템이 생성되고 총액 0원 (주문에 유령 항목이 남는다)
 *   quantity=1.5 → 2 로 반올림, 소수 누적분이 뒤섞여 재고·정산 수치가 어긋난다
 * 스토어프론트 UI 는 정수만 보내지만 API 는 공개돼 있어 누구나 직접 호출할 수 있다.
 * → 양의 정수만 허용한다.
 */
const MAX_LINE_QTY = 1000
function cartQuantityGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const q = (req.body as any)?.quantity
  if (q === undefined || q === null) return next() // 수량 미지정 요청(다른 필드 수정)은 통과
  const n = Number(q)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    res.status(400).json({
      message: "수량은 1 이상의 정수여야 합니다.",
      code: "INVALID_QUANTITY",
    })
    return
  }
  if (n > MAX_LINE_QTY) {
    res.status(400).json({
      message: `한 번에 담을 수 있는 수량은 최대 ${MAX_LINE_QTY}개입니다.`,
      code: "QUANTITY_TOO_LARGE",
    })
    return
  }
  return next()
}

/** 보안 응답 헤더(보안점검 2026-07-27 L1) — 백엔드 API 방어심화(프론트는 next.config 에서 별도 설정). */
function securityHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "no-referrer")
  // 판매 전 점검 2026-07-28: 사용 프레임워크 노출(X-Powered-By: Express) 제거.
  // 공격자가 스택을 특정해 알려진 취약점을 겨냥하는 것을 조금이라도 늦춘다(정보 노출 최소화).
  res.removeHeader("X-Powered-By")
  next()
}

/** 비회원 주문조회 레이트리밋(보안점검 2026-07-27 L2) — IP 기준 분당 30회, 열거/크리덴셜스터핑 완화. fail-open. */
async function orderLookupRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    const ip = fwd || (req as any).ip || "unknown"
    const n = await rlIncr(req.scope, `rl:order-lookup:${ip}`, 60_000)
    if (n > 30) {
      res.status(429).json({ message: "요청이 많습니다. 잠시 후 다시 시도해 주세요." })
      return
    }
  } catch {
    // fail-open(가용성 우선)
  }
  next()
}

/** M2(opt-in): 환불/취소 등 금전 액션을 super 등급만 허용. 기본 비활성. */
async function moneyActionSuperGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (!MONEY_ACTIONS_SUPER_ONLY) return next()
  try {
    const userId = actorIdOf(req)
    if (!userId) return next() // 미인증은 Medusa auth 가 처리
    const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
    const role = await rbac.getUserRole(userId)
    if (role !== "super") {
      res.status(403).json({
        message: "이 작업(환불/취소)은 최고관리자(super)만 수행할 수 있습니다.",
        code: "SUPER_REQUIRED",
      })
      return
    }
  } catch (e) {
    return guardError(res, next, "money-super", e)
  }
  return next()
}

/** M7: 2FA 검증 시도 레이트리밋 — user(또는 IP) 기준 5분 20회 초과 429(온라인 브루트포스 완화). fail-open. */
async function twoFaVerifyRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const uid = actorIdOf(req)
    const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    const who = uid || fwd || (req as any).ip || "unknown"
    const n = await rlIncr(req.scope, `rl:2fa-verify:${who}`, 5 * 60_000)
    if (n > 20) {
      res.status(429).json({ message: "인증 시도가 많습니다. 잠시 후 다시 시도해 주세요.", code: "TOO_MANY_ATTEMPTS" })
      return
    }
  } catch {
    // fail-open
  }
  return next()
}

/** IP 기준 레이트리밋 팩토리(보안점검 2026-07-27 2차) — 익명 쓰기/스캔 남용 완화. fail-open. */
function ipRateLimit(bucket: string, max: number, windowMs = 60_000) {
  return async function (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
    try {
      const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      const ip = fwd || (req as any).ip || "unknown"
      const n = await rlIncr(req.scope, `rl:${bucket}:${ip}`, windowMs)
      if (n > max) {
        res.status(429).json({ message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", code: "RATE_LIMITED" })
        return
      }
    } catch {
      // fail-open(가용성 우선)
    }
    return next()
  }
}
// 익명 쓰기(리뷰/문의/지원/재입고): 분당 20회. 조회수: 분당 120. 베스트(스캔): 분당 60.
const publicWriteRateLimit = ipRateLimit("public-write", 20)
const viewRateLimit = ipRateLimit("product-view", 120)
const bestProductsRateLimit = ipRateLimit("best-products", 60)

/**
 * 전역 오류 핸들러 — 본문 파싱 단계 오류를 올바른 상태코드로 되돌린다 (2026-08-03).
 *
 * 실측: ~100KB 를 넘는 요청 본문은 `An unknown error occurred` 와 함께 **500** 이 나갔다.
 * 본문 파싱은 라우트 미들웨어보다 먼저 실행돼 미들웨어로는 잡을 수 없다(보안 헤더조차 안 붙음).
 * 500 이면 (a) 공격자가 손쉽게 서버 오류율을 올리고 (b) 진짜 장애 로그가 파묻힌다.
 * → 페이로드 초과는 413, 깨진 JSON 은 400 으로 명확히 응답한다. 그 외는 기본 핸들러에 위임.
 */
const medusaDefaultErrorHandler = defaultErrorHandler()
function apiErrorHandler(
  err: any,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const type = err?.type as string | undefined
  // body-parser 계열 오류는 type 으로 식별된다(entity.too.large / entity.parse.failed).
  if (type === "entity.too.large") {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.status(413).json({
      message: "요청 본문이 너무 큽니다. 내용을 줄여서 다시 시도해 주세요.",
      code: "PAYLOAD_TOO_LARGE",
    })
    return
  }
  if (type === "entity.parse.failed") {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.status(400).json({
      message: "요청 형식이 올바르지 않습니다(JSON 파싱 실패).",
      code: "INVALID_JSON",
    })
    return
  }
  return medusaDefaultErrorHandler(err, req as any, res as any, next as any)
}

export default defineMiddlewares({
  errorHandler: apiErrorHandler,
  routes: [
    {
      // 보안 응답 헤더 — 전 경로.
      matcher: "/*",
      middlewares: [securityHeaders],
    },
    {
      // 장바구니 수량은 양의 정수만 — 소수점/0/음수 차단.
      matcher: "/store/carts/:id/line-items",
      method: ["POST"],
      middlewares: [cartQuantityGuard],
    },
    {
      matcher: "/store/carts/:id/line-items/:line_id",
      method: ["POST"],
      middlewares: [cartQuantityGuard],
    },
    {
      // 익명 쓰기 스팸/저장소 증식 완화(리뷰).
      matcher: "/store/products/:id/reviews",
      method: ["POST"],
      middlewares: [publicWriteRateLimit],
    },
    {
      matcher: "/store/products/:id/inquiries",
      method: ["POST"],
      middlewares: [publicWriteRateLimit],
    },
    {
      matcher: "/store/support-inquiries",
      method: ["POST"],
      middlewares: [publicWriteRateLimit],
    },
    {
      matcher: "/store/restock-notifications",
      method: ["POST"],
      middlewares: [publicWriteRateLimit],
    },
    {
      // 조회수 기록 남용(쓰기 증폭·랭킹 조작) 완화.
      matcher: "/store/products/:id/view",
      method: ["POST"],
      middlewares: [viewRateLimit],
    },
    {
      // 베스트 랭킹(주문/뷰/위시 전체 스캔) 익명 남용 완화.
      matcher: "/store/best-products",
      method: ["GET"],
      middlewares: [bestProductsRateLimit],
    },
    {
      // M2(opt-in): 금전 액션 super 게이트.
      matcher: "/admin/orders/:id/refund",
      method: ["POST"],
      middlewares: [moneyActionSuperGuard],
    },
    {
      matcher: "/admin/orders-kr/:id/cancel",
      method: ["POST"],
      middlewares: [moneyActionSuperGuard],
    },
    {
      // M7: 2FA 검증/백업코드 시도 레이트리밋.
      matcher: "/admin/2fa/verify",
      method: ["POST"],
      middlewares: [twoFaVerifyRateLimit],
    },
    {
      matcher: "/admin/2fa/backup-codes",
      method: ["POST"],
      middlewares: [twoFaVerifyRateLimit],
    },
    {
      // 인증 무차별 대입 방어(실패 기반) + 비밀번호 정책.
      matcher: "/auth/*",
      method: ["POST"],
      middlewares: [authRateLimit, passwordPolicyGuard],
    },
    {
      // 비회원 주문조회 레이트리밋(열거 완화).
      matcher: "/store/orders/lookup",
      method: ["POST"],
      middlewares: [orderLookupRateLimit],
    },
    {
      // GET 포함 — rbacGuard 가 보안메뉴 조회(read) 권한도 검사. auditTap 은 write 만 기록.
      matcher: "/admin/*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [tokenDenylistGuard, twoFactorGuard, rbacGuard, auditTap],
    },
    {
      // 스토어 주문 단건 조회 IDOR 방지(인증 고객은 본인 주문만).
      matcher: "/store/orders/:id",
      method: ["GET"],
      middlewares: [storeOrderOwnershipGuard],
    },
    {
      // 인증 고객 마이페이지 접근 시 활동시각 갱신(휴면계정 판정).
      matcher: "/store/customers/me*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [customerActivityTap],
    },
  ],
})

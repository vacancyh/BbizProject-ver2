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
    // 내부 오류 시 fail-open(잠금 방지). 운영 모니터링은 후속.
    console.warn("[rbac] 권한검사 오류, 통과 처리:", (e as Error)?.message)
    return next()
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
  } catch {
    // fail-open
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
    if (!row || !row.enabled) return next() // 2FA 미활성 → 통과

    const h = req.headers.authorization ?? ""
    const tok = h.startsWith("Bearer ") ? h.slice(7) : null
    if (tok && (await svc.isTokenVerified(userId, tok))) return next()

    res.status(403).json({
      message: "2단계 인증이 필요합니다. 다시 로그인해 인증 코드를 입력해 주세요.",
      code: "2FA_REQUIRED",
    })
    return
  } catch (e) {
    console.warn("[2fa] 게이팅 오류, 통과 처리:", (e as Error)?.message)
    return next()
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

export default defineMiddlewares({
  routes: [
    {
      // 인증 무차별 대입 방어(실패 기반) + 비밀번호 정책.
      matcher: "/auth/*",
      method: ["POST"],
      middlewares: [authRateLimit, passwordPolicyGuard],
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

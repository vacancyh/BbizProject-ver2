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
 * 인증 rate limit — 로그인 무차별 대입(brute-force) 방어.
 * 실패(401/400)만 카운트 → 정상 로그인/테스트는 영향 없음, 실패 폭주만 차단.
 * 인메모리(단일 인스턴스 기준). 다중 인스턴스 운영은 Redis 백엔드로 교체 권장(문서화).
 */
const FAIL_WINDOW_MS = 5 * 60_000 // 5분 창
const FAIL_MAX = 10 // 창 내 실패 10회 초과 시 차단
const failStore = new Map<string, { fails: number; resetAt: number }>()
function clientIp(req: MedusaRequest): string {
  const xf = (req.headers["x-forwarded-for"] as string) || ""
  return (xf.split(",")[0].trim() || req.ip || "unknown").toString()
}
function authRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.method !== "POST") return next()
  const ip = clientIp(req)
  const now = Date.now()
  const e = failStore.get(ip)
  if (e && e.resetAt > now && e.fails >= FAIL_MAX) {
    res.setHeader("Retry-After", String(Math.ceil((e.resetAt - now) / 1000)))
    res.status(429).json({
      message: "인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      code: "RATE_LIMITED",
    })
    return
  }
  res.on("finish", () => {
    const sc = res.statusCode
    if (sc === 401 || sc === 400) {
      const cur = failStore.get(ip)
      if (!cur || cur.resetAt < now)
        failStore.set(ip, { fails: 1, resetAt: now + FAIL_WINDOW_MS })
      else cur.fails++
    } else if (sc >= 200 && sc < 300) {
      failStore.delete(ip) // 성공 시 초기화
    }
  })
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
      middlewares: [rbacGuard, auditTap],
    },
    {
      // 스토어 주문 단건 조회 IDOR 방지(인증 고객은 본인 주문만).
      matcher: "/store/orders/:id",
      method: ["GET"],
      middlewares: [storeOrderOwnershipGuard],
    },
  ],
})

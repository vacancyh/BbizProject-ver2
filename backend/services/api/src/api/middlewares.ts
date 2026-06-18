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

export default defineMiddlewares({
  routes: [
    {
      // GET 포함 — rbacGuard 가 보안메뉴 조회(read) 권한도 검사. auditTap 은 write 만 기록.
      matcher: "/admin/*",
      method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      middlewares: [rbacGuard, auditTap],
    },
  ],
})

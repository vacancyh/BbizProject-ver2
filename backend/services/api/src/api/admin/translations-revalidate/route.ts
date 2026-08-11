/**
 * 번역 저장 후 스토어프론트 캐시 무효화 (2026-08-10 신설)
 *  - POST /admin/translations-revalidate
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 상품·카테고리를 고치면 Medusa 가 `product.updated` 같은 이벤트를 쏘고,
 * `storefront-revalidate` 구독자가 스토어프론트 캐시를 지운다.
 *
 * 그런데 **번역 저장은 이벤트를 발행하지 않는다**(@medusajs/translation 모듈).
 * 그래서 운영자가 관리자에서 영어 상품명을 넣어도 고객 화면은 한동안 예전 값을
 * 그대로 보여준다. 상품 목록은 `force-cache` 라 시간이 지나도 안 바뀐다.
 * 실제로 번역을 시드한 뒤 화면이 계속 한국어로 나왔다(2026-08-10).
 *
 * 코어를 고치지 않는 선에서, **관리자 화면이 저장 직후 이 라우트를 부르게** 했다.
 *
 * ── 왜 type: "all" 인가 ─────────────────────────────────────────────────────
 * 번역은 상품·카테고리·컬렉션·공지 등 어떤 엔티티에도 붙을 수 있고, 한 번 저장에
 * 여러 엔티티가 섞일 수 있다. 번역 편집은 자주 일어나는 일이 아니므로
 * 정확히 골라 지우는 복잡도보다 전체 무효화가 낫다.
 *
 * 실패해도 200 을 준다 — 캐시 무효화 실패가 **저장을 되돌리게 하면 안 된다.**
 * (저장은 이미 끝났다. 여기서 500 을 주면 관리자 화면이 "저장 실패"로 오해한다)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { callRevalidate } from "../../../subscribers/revalidate-contract"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = (() => {
    try {
      return req.scope.resolve("logger") as any
    } catch {
      return console
    }
  })()

  const result = await callRevalidate({ type: "all" }, logger)
  res.json({ revalidated: result.ok, reason: result.reason })
}

/**
 * 배너/팝업(Banner) 모델 — 메인 노출 배너 + 팝업 공지.
 *
 * kind: "hero"(메인 슬라이드) | "popup"(홈 진입 팝업)
 * 게시(published) + 노출기간(starts_at~ends_at, null이면 상시) 내 항목만 /store 노출.
 * 이미지는 URL 입력 방식(외부 스토리지 불필요 — 무비용).
 */
import { model } from "@medusajs/framework/utils"

export const BANNER_KINDS = ["hero", "popup"] as const
export type BannerKind = (typeof BANNER_KINDS)[number]

const Banner = model.define("banner", {
  // 고유 id (prefix = bnr)
  id: model.id({ prefix: "bnr" }).primaryKey(),
  // 종류 (hero=메인 슬라이드, popup=홈 팝업)
  kind: model.text().default("hero"),
  // 제목/문구
  title: model.text().translatable(),
  // 이미지 URL
  image_url: model.text(),
  // 클릭 시 이동 링크 (null=링크 없음)
  link_url: model.text().nullable(),
  // 정렬 순서 (오름차순)
  sort_order: model.number().default(0),
  // 게시 상태 (draft/published)
  status: model.text().default("published"),
  // 노출 시작/종료 (null=상시)
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
})

export default Banner

/**
 * CMS(고객센터 콘텐츠) 모듈 서비스 — 공지(Notice) + FAQ(Faq).
 *
 * MedusaService 가 기본 CRUD(create/list/update/delete)를 제공하며,
 * 여기서는 스토어프론트 노출용 "게시본 정렬 조회" 헬퍼만 추가한다.
 */
import { MedusaService } from "@medusajs/framework/utils"
import Notice from "./models/notice"
import Faq from "./models/faq"
import Banner from "./models/banner"
import type { BannerKind } from "./models/banner"
import HomeCuration from "./models/home-curation"

class CmsModuleService extends MedusaService({
  Notice,
  Faq,
  Banner,
  HomeCuration,
}) {
  /** 게시된 홈 큐레이션 product_id 목록 (sort_order 오름차순). */
  async listCuratedProductIds(): Promise<string[]> {
    const rows = await this.listHomeCurations(
      { status: "published" },
      { order: { sort_order: "ASC", created_at: "ASC" } }
    )
    return rows.map((r: any) => r.product_id)
  }
  /**
   * 게시 + 현재 노출기간인 배너 목록 (kind별, sort_order 오름차순).
   * @param kind hero | popup
   * @param now 기준 시각(기본 현재)
   */
  async listActiveBanners(kind: BannerKind, now: Date = new Date()): Promise<any[]> {
    const all = await this.listBanners(
      { kind, status: "published" },
      { order: { sort_order: "ASC", created_at: "ASC" } }
    )
    return all.filter((b: any) => {
      const okStart = !b.starts_at || new Date(b.starts_at) <= now
      const okEnd = !b.ends_at || new Date(b.ends_at) >= now
      return okStart && okEnd
    })
  }
  /**
   * 게시(published) 공지 목록 — 고정(pinned) 우선, 최신순.
   * @returns Notice[] (pinned desc, created_at desc)
   */
  async listPublishedNotices(): Promise<any[]> {
    return this.listNotices(
      { status: "published" },
      { order: { pinned: "DESC", created_at: "DESC" } }
    )
  }

  /**
   * 게시(published) FAQ 목록 — sort_order 오름차순, 생성순.
   * @returns Faq[] (sort_order asc, created_at asc)
   */
  async listPublishedFaqs(): Promise<any[]> {
    return this.listFaqs(
      { status: "published" },
      { order: { sort_order: "ASC", created_at: "ASC" } }
    )
  }
}

export default CmsModuleService

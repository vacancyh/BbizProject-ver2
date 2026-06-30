/**
 * 공지사항(Notice) 모델 — 고객센터 공지.
 *
 * 고객센터(CS) 공지/FAQ 는 기존에 스토어프론트 정적 mock 으로만 존재했음(lib/data/cs.ts).
 * 이 모듈로 관리자(admin)에서 등록/수정/삭제하고 스토어프론트가 실데이터로 노출한다.
 *
 * 상태(status): draft(미게시) → published(게시). 게시본만 /store 노출.
 */
import { model } from "@medusajs/framework/utils"

export const NOTICE_STATUSES = ["draft", "published"] as const
export type NoticeStatus = (typeof NOTICE_STATUSES)[number]

const Notice = model.define("notice", {
  // 고유 id (prefix = ntc)
  id: model.id({ prefix: "ntc" }).primaryKey(),
  // 공지 제목
  title: model.text(),
  // 공지 본문
  body: model.text(),
  // 상단 고정 여부 (true = 목록 최상단 노출)
  pinned: model.boolean().default(false),
  // 게시 상태
  status: model.text().default("published"),
})

export default Notice

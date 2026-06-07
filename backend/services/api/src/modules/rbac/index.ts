/**
 * RBAC(관리자 권한) 모듈 — 경계 스텁 (Phase 0)
 *
 * 역할: SUPER/OPERATION/CS/MARKETER 등급 + 메뉴별·기능별 CRUD 2계층 권한.
 * 출처: 관리자_설계.md §5.1 / 쇼핑몰_전용_QA_v4.md ADM-R.
 *
 * ⚠️ Phase 0 = 폴더 경계만. 모델·미들웨어·migration은 ② 도메인 루프(기반 도메인)에서 구현.
 *    구현 시 models/{role,permission,role-permission}.ts + service.ts(MedusaService) + migrations 추가 후
 *    medusa-config.ts modules에 resolve 등록한다. (현재 미등록 — 등록 전까지 build 영향 없음)
 *
 * 가드레일: Medusa core(users) 수정 금지. user ↔ role 관계는 src/links 로 연결.
 */
import { Module } from "@medusajs/framework/utils"
import RbacModuleService from "./service"

export const RBAC_MODULE = "rbac"

export default Module(RBAC_MODULE, {
  service: RbacModuleService,
})

/**
 * 타임세일 자동 만료·원가복원 스케줄 작업 — 진입점
 *
 * Medusa v2 는 src/jobs/ 디렉토리의 파일만 scheduled job 으로 자동 로드합니다.
 * 실제 로직은 modules/time-sale/jobs/time-sale-expiry-check.ts 에 위치하며,
 * 본 파일은 해당 모듈을 re-export 하는 진입점 역할을 합니다.
 */
export { default, config } from "../modules/time-sale/jobs/time-sale-expiry-check"

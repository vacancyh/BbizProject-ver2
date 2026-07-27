/**
 * 휴면계정 파이프라인 스케줄 job (PIPA 개인정보보호법) — 보안점검 2026-07-27(H7).
 *
 * Medusa v2 는 src/jobs/*.ts 를 scheduled job 으로 자동 로드한다.
 * 매일 03:10 에 휴면/사전통지 대상을 산출해 로깅하고 이벤트를 emit 한다.
 *  - atRisk(휴면 30일 전): 사전 안내 대상 → customer.dormancy.at_risk 이벤트
 *  - dormant(1년 미접속): 분리보관/파기 대상 → customer.dormancy.dormant 이벤트
 * ⚠️ 실제 알림 발송·분리보관·파기는 알림 provider/분리 스토리지 정책 연동 지점(무단 파기 방지 위해 자동 삭제 안 함).
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CUSTOMER_DORMANCY_MODULE } from "../modules/customer-dormancy"

export default async function dormancyPipelineJob(container: any) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const svc: any = container.resolve(CUSTOMER_DORMANCY_MODULE)

  const dormantDays = Number(process.env.DORMANCY_DAYS || 365)
  const warnDays = Number(process.env.DORMANCY_WARN_DAYS || 335)

  const { atRisk, dormant, checkedAt } = await svc.runPipeline(Date.now(), dormantDays, warnDays)
  logger.info(
    `[dormancy] 파이프라인 실행(${checkedAt}) — 사전통지 대상=${atRisk.length}, 휴면 대상=${dormant.length}`
  )

  // 이벤트 emit(선택) — 알림 subscriber/분리보관 처리기가 있으면 소비. 없으면 무해.
  try {
    const eventBus = container.resolve(Modules.EVENT_BUS)
    if (eventBus?.emit) {
      if (atRisk.length) {
        await eventBus.emit({ name: "customer.dormancy.at_risk", data: { customer_ids: atRisk, checkedAt } })
      }
      if (dormant.length) {
        await eventBus.emit({ name: "customer.dormancy.dormant", data: { customer_ids: dormant, checkedAt } })
      }
    }
  } catch (e) {
    logger.warn(`[dormancy] 이벤트 emit 생략(무시): ${(e as Error)?.message}`)
  }

  // TODO(PIPA 후속): ① atRisk → 사전 안내 발송(알림 provider) ② dormant → 분리보관(별도 스토리지)
  //                  ③ 분리보관 N일 경과 → 파기. provider/스토리지 정책 확정 후 연동.
}

export const config = {
  name: "dormancy-pipeline",
  schedule: "10 3 * * *", // 매일 03:10
}

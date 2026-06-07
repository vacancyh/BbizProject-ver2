import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { STATE_MACHINE_MODULE } from "./index"
import ORDER_CONFIG from "./config/order"
import PAYMENT_CONFIG from "./config/payment"
import REFUND_CONFIG from "./config/refund"
import FULFILLMENT_CONFIG from "./config/fulfillment"

/**
 * state-machine module 의 4 도메인 config seed 스크립트입니다.
 *
 * 실행 방법:
 *   npx medusa exec ./src/modules/state-machine/seed.ts
 *
 * 동작:
 * - 4 도메인 (order / payment / refund / fulfillment) 의 config 가 이미 존재하면 update,
 *   존재하지 않으면 create 합니다 (idempotent).
 */
export default async function seedStateMachineConfigs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: any = container.resolve(STATE_MACHINE_MODULE)

  const configs = [ORDER_CONFIG, PAYMENT_CONFIG, REFUND_CONFIG, FULFILLMENT_CONFIG]

  for (const cfg of configs) {
    const existing = await service.listStateMachineConfigs({ domain: cfg.domain })

    if (existing && existing.length > 0) {
      await service.updateStateMachineConfigs({
        id: existing[0].id,
        states: cfg.states,
        transitions: cfg.transitions,
      })
      logger.info(`[state-machine:seed] ${cfg.domain} config 를 update 했습니다.`)
    } else {
      await service.createStateMachineConfigs({
        domain: cfg.domain,
        states: cfg.states,
        transitions: cfg.transitions,
      })
      logger.info(`[state-machine:seed] ${cfg.domain} config 를 create 했습니다.`)
    }
  }

  logger.info("[state-machine:seed] 4 도메인 config seed 완료입니다.")
}

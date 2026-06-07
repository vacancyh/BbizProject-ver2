// 스토어 이름(DB)을 브랜드 변수 APP_NAME_KO 로 동기화하는 스크립트.
// 실행: npx medusa exec ./src/scripts/set-store-name.ts
// 단일 소스 원칙: docker-compose 의 APP_NAME_KO 1곳만 바꾸면
//   - 대시보드 브랜드 텍스트(brand-i18n.sh 가 빌드 산출물에 치환)
//   - 상단 스토어 이름(DB, 본 스크립트가 동기화)
// 이 모두 같은 값으로 통일됩니다. (기동 시 prod-start.sh 가 호출)
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function setStoreName({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModule = container.resolve(Modules.STORE)

  const name = (process.env.APP_NAME_KO || "쇼핑몰").trim()

  const stores = await storeModule.listStores()
  if (stores.length === 0) {
    logger.warn("[set-store-name] 스토어가 없습니다. skip.")
    return
  }

  for (const s of stores) {
    if (s.name === name) {
      logger.info(`[set-store-name] 이미 동기화됨: "${name}" (id=${s.id}) skip.`)
      continue
    }
    await storeModule.updateStores(s.id, { name })
    logger.info(`[set-store-name] 스토어 이름 갱신: "${s.name}" -> "${name}" (id=${s.id})`)
  }
}

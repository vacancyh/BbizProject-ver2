import { Text } from "@modules/common/components/ui"

import Medusa from "../../../common/icons/medusa"
import NextJs from "../../../common/icons/nextjs"

const MedusaCTA = () => {
  return (
    // 로고는 18px 로 보이되 **누르는 영역은 24px** 로 넓힌다.
    // 링크 자체가 18×18 이면 모바일에서 누르기 어렵다(WCAG 2.5.8 최소 24×24).
    // (2026-08-06 실측으로 발견)
    <Text className="flex gap-x-1 txt-compact-small-plus items-center">
      Powered by
      <a
        href="https://www.medusajs.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Medusa 웹사이트(새 창)"
        className="grid h-6 w-6 shrink-0 place-items-center"
      >
        <Medusa fill="#9ca3af" className="fill-[#9ca3af]" />
      </a>
      &
      <a
        href="https://nextjs.org"
        target="_blank"
        rel="noreferrer"
        aria-label="Next.js 웹사이트(새 창)"
        className="grid h-6 w-6 shrink-0 place-items-center"
      >
        <NextJs fill="#9ca3af" />
      </a>
    </Text>
  )
}

export default MedusaCTA

import { Text } from "@modules/common/components/ui"

import { getT } from "@lib/i18n"

import Medusa from "../../../common/icons/medusa"
import NextJs from "../../../common/icons/nextjs"

// 서버 컴포넌트다(푸터·체크아웃 레이아웃에서만 쓰인다). 클라이언트에서 쓰게 되면
// `@lib/i18n` 이 클라이언트 번들로 끌려가 화면이 500 이 되므로 useT 로 바꿔야 한다.
const MedusaCTA = async () => {
  const t = await getT()
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
        aria-label={t("footer.medusaLink")}
        className="grid h-6 w-6 shrink-0 place-items-center"
      >
        <Medusa fill="#9ca3af" className="fill-[#9ca3af]" />
      </a>
      &
      <a
        href="https://nextjs.org"
        target="_blank"
        rel="noreferrer"
        aria-label={t("footer.nextLink")}
        className="grid h-6 w-6 shrink-0 place-items-center"
      >
        <NextJs fill="#9ca3af" />
      </a>
    </Text>
  )
}

export default MedusaCTA

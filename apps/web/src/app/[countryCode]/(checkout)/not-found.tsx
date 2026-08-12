import { Metadata } from "next"

import NotFoundView from "@modules/common/components/not-found-view"

export const metadata: Metadata = {
  title: "404",
  description: "Page not found",
}

/**
 * 주소가 아예 매칭되지 않았을 때의 404.
 *
 * 화면 자체는 `NotFoundView` 하나로 모았다 — 세그먼트마다 not-found.tsx 가
 * 필요한 구조라(Next 가 상위로 올라가지 않는다) 문구가 흩어지면 금방 어긋난다.
 */
export default function NotFound() {
  return <NotFoundView />
}

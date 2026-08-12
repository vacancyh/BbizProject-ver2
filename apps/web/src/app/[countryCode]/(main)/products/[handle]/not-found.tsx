/**
 * 이 세그먼트에서 notFound() 가 났을 때 보여 줄 화면.
 *
 * Next 는 notFound() 에 대해 **이 세그먼트의** not-found.tsx 만 찾는다.
 * 상위 `(main)/not-found.tsx` 로 올라가지 않으므로, 이 파일이 없으면
 * 프레임워크 기본 "404" 맨 화면이 나간다(2026-08-12 실측).
 */
import NotFoundView from "@modules/common/components/not-found-view"

export default function NotFound() {
  return <NotFoundView />
}

// Floating Result — 일반 저장/메모 저장/작은 수정 등 비차단(non-blocking) 피드백. (지시서 §8)
// Medusa 전역 Toaster(관리자 앱이 기본 마운트)를 통해 우측 하단 토스트로 표시합니다.
// 차단형 Result Modal 과 구분: 사용자의 흐름을 끊지 않아도 되는 가벼운 완료 알림에 사용하세요.
import { toast } from "@medusajs/ui"

export const floatingResult = {
  /** 임의 제목/설명 토스트(성공 톤) */
  show: (title: string, description?: string) => toast.success(title, { description }),
  /** "저장했습니다." */
  saved: (description?: string) => toast.success("저장했습니다.", { description }),
  /** "임시 저장했습니다." */
  draftSaved: (description?: string) => toast.success("임시 저장했습니다.", { description }),
  /** "메모를 저장했습니다." */
  memoSaved: (description?: string) => toast.success("메모를 저장했습니다.", { description }),
  /** 안내 톤 */
  info: (title: string, description?: string) => toast.info(title, { description }),
  /** 오류 톤 */
  error: (title: string, description?: string) => toast.error(title, { description }),
}

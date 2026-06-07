// Confirm Modal — 삭제/환불/주문취소/배송완료 강제/정산확정/권한변경/대량처리 등 위험 작업 확인. (지시서 §8)
// 두 가지 사용법을 제공합니다.
//  1) useAdminConfirm() : await 로 결과를 받는 명령형 훅 (권장, Medusa usePrompt 래핑)
//  2) <AdminConfirmModal/> : open 상태를 직접 제어하는 선언형 컴포넌트
import { Prompt, usePrompt } from "@medusajs/ui"

export type ConfirmVariant = "danger" | "confirmation"

export type AdminConfirmOptions = {
  title: string
  description: string
  variant?: ConfirmVariant
  confirmText?: string
  cancelText?: string
  /** 입력 확인이 필요한 고위험 작업용(예: "삭제") */
  verificationText?: string
  verificationInstruction?: string
}

/** await 한 줄로 확인 모달을 띄우고 결과(boolean)를 받는 훅. */
export const useAdminConfirm = () => {
  const prompt = usePrompt()
  return (opts: AdminConfirmOptions): Promise<boolean> =>
    prompt({
      title: opts.title,
      description: opts.description,
      variant: opts.variant ?? "confirmation",
      confirmText: opts.confirmText ?? "확인",
      cancelText: opts.cancelText ?? "취소",
      verificationText: opts.verificationText,
      verificationInstruction: opts.verificationInstruction,
    })
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: ConfirmVariant
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
}

/** open 을 직접 제어하는 선언형 확인 모달. */
export const AdminConfirmModal = ({
  open,
  onOpenChange,
  title,
  description,
  variant = "confirmation",
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
}: Props) => (
  <Prompt open={open} onOpenChange={onOpenChange} variant={variant}>
    <Prompt.Content>
      <Prompt.Header>
        <Prompt.Title>{title}</Prompt.Title>
        <Prompt.Description>{description}</Prompt.Description>
      </Prompt.Header>
      <Prompt.Footer>
        <Prompt.Cancel>{cancelText}</Prompt.Cancel>
        <Prompt.Action onClick={onConfirm}>{confirmText}</Prompt.Action>
      </Prompt.Footer>
    </Prompt.Content>
  </Prompt>
)

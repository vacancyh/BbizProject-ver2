// Result Modal — 중요 작업 완료 시 중앙에 결과를 알리는 모달. (지시서 §8)
// 예: "환불 처리했습니다." / "정산을 확정했습니다." 처럼 사용자가 확실히 인지해야 하는 결과.
// 일반 저장 등 가벼운 작업은 이 모달 대신 floatingResult(비차단)를 사용하세요.
import { Prompt } from "@medusajs/ui"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 결과 상세 문구 (예: "환불 처리했습니다.") */
  message: string
  confirmText?: string
}

export const AdminResultModal = ({
  open,
  onOpenChange,
  title,
  message,
  confirmText = "확인",
}: Props) => (
  <Prompt open={open} onOpenChange={onOpenChange} variant="confirmation">
    <Prompt.Content>
      <Prompt.Header>
        <Prompt.Title>{title}</Prompt.Title>
        <Prompt.Description>{message}</Prompt.Description>
      </Prompt.Header>
      <Prompt.Footer>
        <Prompt.Action onClick={() => onOpenChange(false)}>{confirmText}</Prompt.Action>
      </Prompt.Footer>
    </Prompt.Content>
  </Prompt>
)

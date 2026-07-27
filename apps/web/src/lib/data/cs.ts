// 고객센터(CS) 데이터 계층 — 백엔드 cms 모듈 연동(공지/FAQ)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트로 게시된 공지/FAQ를 조회한다.
//   - GET /store/notices  (backend: src/api/store/notices/route.ts)
//   - GET /store/faqs     (backend: src/api/store/faqs/route.ts)
// 네트워크/백엔드 오류 시 결정적 mock 으로 폴백(화면 깨짐 방지).

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Notice = {
  id: string
  title: string
  body: string
  /** ISO 8601 */
  created_at: string
  pinned?: boolean
}

export type Faq = {
  id: string
  category: "주문/결제" | "배송" | "교환/반품" | "회원/적립금"
  question: string
  answer: string
}

const MOCK_NOTICES: Notice[] = [
  {
    id: "ntc_1",
    title: "[안내] 설 연휴 배송 일정 안내",
    body: "설 연휴 기간(2/14~2/17) 동안 출고가 순차적으로 진행됩니다. 연휴 전 주문은 2/13까지 결제 완료 시 정상 출고됩니다.",
    created_at: "2026-02-05T09:00:00.000Z",
    pinned: true,
  },
  {
    id: "ntc_2",
    title: "[공지] 개인정보처리방침 개정 안내",
    body: "개인정보처리방침이 2026년 1월 1일자로 개정되었습니다. 자세한 내용은 하단 개인정보처리방침 페이지를 참고해 주세요.",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ntc_3",
    title: "[이벤트] 신규 회원 적립금 지급",
    body: "신규 가입 회원께 500원 적립금을 즉시 지급해 드립니다. 마이페이지 > 적립금에서 확인하세요.",
    created_at: "2025-12-20T00:00:00.000Z",
  },
]

const MOCK_FAQS: Faq[] = [
  {
    id: "faq_1",
    category: "주문/결제",
    question: "주문 후 결제수단을 변경할 수 있나요?",
    answer:
      "결제 완료 전이라면 장바구니에서 다시 진행하실 수 있습니다. 결제 완료 후 변경은 고객센터로 문의해 주세요.",
  },
  {
    id: "faq_2",
    category: "배송",
    question: "배송은 얼마나 걸리나요?",
    answer:
      "일반적으로 결제 완료 후 2~3 영업일 이내 출고되며, 도서·산간 지역은 1~2일 추가될 수 있습니다.",
  },
  {
    id: "faq_3",
    category: "교환/반품",
    question: "교환·반품은 어떻게 신청하나요?",
    answer:
      "상품 수령 후 7일 이내 마이페이지 > 주문 내역에서 신청하실 수 있습니다. 단순 변심의 경우 왕복 배송비가 부과될 수 있습니다.",
  },
  {
    id: "faq_4",
    category: "회원/적립금",
    question: "적립금은 어디서 확인하나요?",
    answer:
      "마이페이지 > 적립금에서 보유 적립금과 적립/사용 내역을 확인하실 수 있습니다.",
  },
]

export async function listNotices(): Promise<Notice[]> {
  // ISR: 관리자 게시 콘텐츠가 최대 60초 내 스토어에 반영(태그 revalidate 도 지원).
  const next = { ...(await getCacheOptions("notices")), revalidate: 60 }
  try {
    const res = await sdk.client.fetch<{ notices: Notice[] }>(
      `/store/notices`,
      { method: "GET", next }
    )
    const notices = res?.notices ?? []
    // 백엔드가 비어있지 않으면 그대로, 비어있으면 mock 폴백(데모 화면 보장)
    return notices.length ? notices : MOCK_NOTICES
  } catch {
    return [...MOCK_NOTICES].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
      return a.created_at < b.created_at ? 1 : -1
    })
  }
}

export async function listFaqs(): Promise<Faq[]> {
  const next = { ...(await getCacheOptions("faqs")), revalidate: 60 }
  try {
    const res = await sdk.client.fetch<{ faqs: Faq[] }>(`/store/faqs`, {
      method: "GET",
      next,
    })
    const faqs = res?.faqs ?? []
    return faqs.length ? faqs : MOCK_FAQS
  } catch {
    return MOCK_FAQS
  }
}

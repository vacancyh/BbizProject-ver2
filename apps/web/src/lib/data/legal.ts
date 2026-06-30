// 약관/법적 문서 데이터 계층 (실제 백엔드 연동 + 폴백)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/legal-docs/:slug` 로 게시(published) 약관을 조회한다.
// (백엔드: src/api/store/legal-docs/[slug]/route.ts · legal-kr/legal-doc 모듈)
// 백엔드에 게시본이 없으면 아래 플레이스홀더로 폴백(화면 공백 방지).
// ⚠️ 폴백 본문은 예시이며, 실제 약관은 관리자 약관관리에서 게시·운영합니다.

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type LegalDoc = {
  slug: string
  title: string
  /** ISO 8601 (시행일/개정일, 고정값 — 결정적) */
  effective_at: string
  /** 마크다운-라이트 본문 (단락 구분) */
  body: string
}

const FALLBACK_DOCS: Record<string, LegalDoc> = {
  "terms-of-use": {
    slug: "terms-of-use",
    title: "이용약관",
    effective_at: "2026-01-01T00:00:00.000Z",
    body: `제1조 (목적)
이 약관은 쇼핑몰(이하 "회사")이 운영하는 온라인 쇼핑몰에서 제공하는 서비스의 이용조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "회원"이란 회사와 이용계약을 체결하고 회원 아이디를 부여받은 자를 말합니다.
2. "비회원"이란 회원에 가입하지 않고 회사가 제공하는 서비스를 이용하는 자를 말합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.

제4조 (서비스의 제공 및 변경)
회사는 상품 또는 용역에 대한 정보 제공 및 구매계약의 체결, 배송 등 일련의 서비스를 제공합니다.

제5조 (회원의 의무)
회원은 관계 법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 회사가 공지한 주의사항을 준수하여야 합니다.

※ 본 약관은 예시 플레이스홀더이며, 실제 서비스 운영 전 법무 검토를 거쳐 확정합니다.`,
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "개인정보처리방침",
    effective_at: "2026-01-01T00:00:00.000Z",
    body: `회사는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같은 처리방침을 둡니다.

1. 수집하는 개인정보 항목
- 필수: 이름, 이메일, 휴대전화번호, 배송지 주소
- 결제 시: 결제수단 정보(거래 처리 목적)

2. 개인정보의 수집·이용 목적
- 회원 관리, 주문·결제·배송, 고객 문의 대응, 법령상 의무 이행

3. 개인정보의 보유 및 이용기간
- 회원 탈퇴 시까지. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
  (계약·청약철회 기록 5년, 대금결제·재화공급 기록 5년, 소비자 불만·분쟁처리 기록 3년)

4. 개인정보의 제3자 제공
- 회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 배송 등 서비스 이행을 위해 필요한 최소한의 정보를 위탁할 수 있습니다.

5. 개인정보 보호책임자
- 성명: 홍길동 / 연락처: privacy@shop.example

※ 본 방침은 예시 플레이스홀더이며, 실제 서비스 운영 전 확정합니다.`,
  },
}

export async function getLegalDoc(slug: string): Promise<LegalDoc | null> {
  const next = { ...(await getCacheOptions(`legal-${slug}`)) }
  try {
    const res = await sdk.client.fetch<{ doc: LegalDoc }>(
      `/store/legal-docs/${slug}`,
      { method: "GET", next, cache: "force-cache" }
    )
    if (res?.doc?.body) return res.doc
  } catch {
    // 백엔드 미게시/오류 → 폴백 플레이스홀더
  }
  return FALLBACK_DOCS[slug] ?? null
}

export function listLegalDocs(): LegalDoc[] {
  return Object.values(FALLBACK_DOCS)
}

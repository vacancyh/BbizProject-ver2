import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Hammer } from "lucide-react";

/**
 * DomainPlaceholder — Phase 0 스캐폴드용 도메인 화면 자리표시.
 * IA/네비게이션 동작 + 갭 배지 노출 확인용. 실데이터·표·상세는 ② 도메인 루프에서 구현.
 */
export function DomainPlaceholder({
  title,
  sub,
  gap,
}: {
  title: string;
  sub?: string;
  gap?: "A" | "B" | null;
}) {
  return (
    <div>
      <PageHeader title={title} sub={sub} gap={gap} />
      <EmptyState
        icon={<Hammer size={26} />}
        title="화면 준비 중"
        description="이 도메인 화면은 ② 도메인 슬라이스 루프에서 Medusa 실데이터 연동과 함께 구현됩니다."
      />
    </div>
  );
}

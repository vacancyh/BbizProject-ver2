import { cn } from "@/lib/utils";

/**
 * GapBadge — 갭 유형 표기 배지.
 *  - "B"(우리有·Medusa無): "신규기능" 배지 (custom module 구현 대상)
 *  - "A"(Medusa有·우리 자리 미정): "신규이전" 배지 (참고용)
 * FEATURE_MATRIX / navigation.ts 의 gap 필드와 1:1.
 *
 * compact=true: 좁은 공간(사이드바)용 점 마커. 전체 텍스트는 tooltip 유지.
 */
export function GapBadge({
  type,
  compact = false,
  className,
}: {
  type: "A" | "B";
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    const isB = type === "B";
    return (
      <span
        className={cn(
          "inline-flex h-[7px] w-[7px] flex-shrink-0 rounded-pill",
          isB ? "bg-warning" : "bg-info",
          className
        )}
        title={isB ? "신규기능 — 한국형 custom module" : "신규이전 — Medusa 기능을 우리 화면으로 이전"}
        aria-label={isB ? "신규기능" : "신규이전"}
      />
    );
  }
  if (type === "B") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-pill border border-warning/30 bg-warning-weak px-1.5 py-0.5 text-[10px] font-bold text-warning",
          className
        )}
        title="Medusa core에 없는 한국형 기능 — custom module로 구현"
      >
        신규기능
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-info/30 bg-info-weak px-1.5 py-0.5 text-[10px] font-bold text-info",
        className
      )}
      title="Medusa 기능 — 우리 화면으로 신규 이전"
    >
      신규이전
    </span>
  );
}

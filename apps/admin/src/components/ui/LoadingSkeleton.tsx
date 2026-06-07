import { cn } from "@/lib/utils";

/** LoadingSkeleton — 로딩 자리표시. rows 만큼 막대 렌더(표/카드 공용). */
export function LoadingSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded-sm bg-surface-2" />
      ))}
    </div>
  );
}

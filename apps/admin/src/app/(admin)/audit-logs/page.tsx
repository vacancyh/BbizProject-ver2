"use client";

/**
 * 감사 로그 화면 — 모든 write 액션 append-only 기록 조회(읽기 전용).
 * 데이터는 lib/api/audit.ts(백엔드 /admin/audit/logs) 호출. PII는 저장 시점에 마스킹됨.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  PageHeader,
  FilterBar,
  DataTable,
  Pagination,
  useToast,
  type Column,
} from "@/components/ui";
import { getLogs, type AuditLog } from "@/lib/api/audit";

const METHOD_TONE: Record<string, string> = {
  POST: "bg-success-weak text-success",
  PUT: "bg-warning-weak text-warning",
  PATCH: "bg-warning-weak text-warning",
  DELETE: "bg-danger-weak text-danger",
};

const PAGE_SIZE = 20;

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
  } catch {
    return iso;
  }
}

export default function AuditLogsPage() {
  const toast = useToast();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLogs({
        method: method || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setItems(res.items);
      setCount(res.count);
    } catch (e) {
      toast.show(`감사 로그 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [method, page, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuditLog>[] = [
    {
      header: "시각(KST)",
      width: "180px",
      cell: (l) => <span className="whitespace-nowrap text-xs text-text-2">{formatKst(l.created_at)}</span>,
    },
    {
      header: "행위자",
      cell: (l) => (
        <span className="text-sm text-text-2">{l.actor_email ?? l.actor_id ?? "—"}</span>
      ),
    },
    {
      header: "메서드",
      width: "90px",
      cell: (l) => (
        <span className={`inline-flex rounded-pill px-2 py-0.5 text-[11px] font-bold ${METHOD_TONE[l.method] ?? "bg-surface-2 text-text-2"}`}>
          {l.method}
        </span>
      ),
    },
    { header: "액션", cell: (l) => <span className="text-sm font-medium text-text">{l.action}</span> },
    {
      header: "경로",
      cell: (l) => <span className="text-xs text-text-3">{l.path}</span>,
    },
    {
      header: "상태",
      width: "70px",
      numeric: true,
      cell: (l) => <span className="tabular-nums text-sm text-text-2">{l.status_code}</span>,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="감사 로그"
        sub={`모든 변경 액션 append-only 기록 · PII 마스킹 적용 · 총 ${count.toLocaleString("ko-KR")}건`}
        gap="B"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2"
          >
            <RefreshCw size={15} />
            새로고침
          </button>
        }
      />

      <FilterBar searchPlaceholder="검색(준비 중)">
        <select
          className="h-9 rounded-sm border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
          value={method}
          onChange={(e) => {
            setPage(1);
            setMethod(e.target.value);
          }}
        >
          <option value="">전체 메서드</option>
          <option value="POST">POST(생성)</option>
          <option value="PUT">PUT(수정)</option>
          <option value="PATCH">PATCH(수정)</option>
          <option value="DELETE">DELETE(삭제)</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(l) => l.id}
        loading={loading}
        emptyTitle="감사 로그가 없습니다"
        emptyDescription="관리자 변경 액션이 발생하면 여기에 기록됩니다."
      />

      {totalPages > 1 ? (
        <div className="mt-4 rounded bg-surface shadow-xs">
          <Pagination
            page={page}
            pageCount={totalPages}
            info={`${count.toLocaleString("ko-KR")}건 중 ${page}/${totalPages} 페이지`}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

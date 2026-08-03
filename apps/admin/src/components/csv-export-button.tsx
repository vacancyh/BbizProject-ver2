"use client";

/**
 * CSV 내보내기 버튼 (2026-08-03 신설)
 *
 * 왜 컴포넌트로 만들었나: 내보내기 API 는 Bearer 토큰이 필요해서
 * 운영자가 브라우저 주소창에 URL 을 붙여넣는 방식으로는 쓸 수 없다.
 * (토큰 없이 열면 401 → "기능은 있는데 쓸 수 없는" 상태가 된다)
 * 그래서 토큰을 붙여 fetch 한 뒤 Blob 으로 내려받는다.
 *
 * 기간 선택은 선택사항이다 — 비워 두면 전체를 받는다.
 */
import { useState } from "react";
import { BACKEND_URL, getToken } from "@/lib/api/client";

type Props = {
  /** 내보내기 경로 — 예: "/admin/exports/orders" */
  path: string;
  /** 버튼 라벨 */
  label?: string;
  /** 기간 선택 UI 표시 여부 */
  withPeriod?: boolean;
};

export default function CsvExportButton({
  path,
  label = "엑셀 내려받기",
  withPeriod = true,
}: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const url = `${BACKEND_URL}${path}${qs.toString() ? `?${qs}` : ""}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });

      if (res.status === 401) throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      if (res.status === 403) throw new Error("이 자료를 내려받을 권한이 없습니다.");
      if (!res.ok) throw new Error(`내려받기에 실패했습니다. (${res.status})`);

      // 서버가 보낸 파일명(RFC 5987 filename*)을 그대로 쓴다 — 한글 파일명 유지.
      const disp = res.headers.get("content-disposition") ?? "";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(disp);
      const plain = /filename="([^"]+)"/i.exec(disp);
      const filename = star
        ? decodeURIComponent(star[1])
        : plain
          ? plain[1]
          : "export.csv";

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setError((e as Error)?.message ?? "내려받기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {withPeriod && (
        <>
          <label className="flex flex-col text-xs text-gray-600">
            시작일
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              data-testid="csv-from"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            종료일
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              data-testid="csv-to"
            />
          </label>
        </>
      )}
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-60"
        data-testid="csv-export-button"
      >
        {busy ? "내려받는 중…" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}

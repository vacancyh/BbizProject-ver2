import "@/styles/screen.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AuthGuard } from "@/components/layout/AuthGuard";

/** 관리자 셸 레이아웃 — 사이드바 + 상단바 + 콘텐츠. prototype #app 그리드 이식. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-[248px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </div>
  );
}

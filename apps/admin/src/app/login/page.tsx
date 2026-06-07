"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/api/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("djemalsdlqslek12!@");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded bg-surface p-8 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-sm font-extrabold text-white">
            CO
          </span>
          <div className="text-base font-extrabold leading-tight">
            커머스 운영툴
            <small className="block text-[11px] font-normal tracking-wide text-text-3">COMMERCE OPS</small>
          </div>
        </div>
        <h1 className="mb-1 text-lg font-bold">관리자 로그인</h1>
        <p className="mb-5 text-sm text-text-2">쇼핑몰 관리자 계정으로 로그인하세요.</p>

        {expired ? (
          <p className="mb-4 rounded-sm bg-warning-weak px-3 py-2 text-sm text-warning">
            세션이 만료되어 다시 로그인해 주세요.
          </p>
        ) : null}

        <label className="mb-1 block text-xs font-semibold text-text-2">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 h-10 w-full rounded-sm border border-border px-3 text-sm outline-none focus:border-primary"
          placeholder="admin@example.com"
        />
        <label className="mb-1 block text-xs font-semibold text-text-2">비밀번호</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 h-10 w-full rounded-sm border border-border px-3 text-sm outline-none focus:border-primary"
          placeholder="••••••••"
        />
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-sm bg-primary text-sm font-bold text-white hover:bg-primary-press disabled:opacity-60"
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

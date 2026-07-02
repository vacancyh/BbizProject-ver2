"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, clearToken } from "@/lib/api/client";
import { getTwoFactorStatus, verifyTwoFactor } from "@/lib/api/two-factor";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";
  const twofaExpired = searchParams.get("twofa") === "1";
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("djemalsdlqslek12!@");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 2FA 2단계 — 비밀번호 통과 후 이 계정이 2FA 활성이면 코드 입력 단계로 전환.
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // 비밀번호 통과 → 2FA 활성 여부 확인
      const status = await getTwoFactorStatus();
      if (status.enabled) {
        setOtpStep(true);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyTwoFactor(otp.trim());
      router.push("/dashboard");
    } catch {
      setError("인증 코드가 올바르지 않습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const cancelOtp = () => {
    // 2FA 미완료 로그인은 무효화 — 발급된 토큰 폐기.
    clearToken();
    setOtpStep(false);
    setOtp("");
    setPassword("");
    setError(null);
  };

  if (otpStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <form onSubmit={onVerifyOtp} className="w-full max-w-sm rounded bg-surface p-8 shadow-md">
          <h1 className="mb-1 text-lg font-bold">2단계 인증</h1>
          <p className="mb-5 text-sm text-text-2">
            인증앱에 표시된 6자리 코드를 입력해 주세요.
          </p>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mb-4 h-12 w-full rounded-sm border border-border px-3 text-center text-xl tracking-[0.4em] outline-none focus:border-primary"
            placeholder="000000"
          />
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="mb-2 h-10 w-full rounded-sm bg-primary text-sm font-bold text-white hover:bg-primary-press disabled:opacity-60"
          >
            {loading ? "확인 중…" : "인증"}
          </button>
          <button
            type="button"
            onClick={cancelOtp}
            className="h-9 w-full rounded-sm text-sm text-text-2 hover:text-text"
          >
            취소하고 처음으로
          </button>
        </form>
      </div>
    );
  }

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
        {twofaExpired ? (
          <p className="mb-4 rounded-sm bg-warning-weak px-3 py-2 text-sm text-warning">
            2단계 인증이 필요합니다. 로그인 후 인증 코드를 입력해 주세요.
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

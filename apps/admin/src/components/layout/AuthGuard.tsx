"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api/client";

/**
 * 토큰 유무를 검사하는 클라이언트 가드.
 * 토큰이 없으면 /login 으로 보내고, 확인 전에는 children 렌더를 보류한다.
 * 토큰 부재 시 보호 화면이 잠깐도 노출되지 않게 막는다.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-text-2">
        불러오는 중…
      </div>
    );
  }

  return <>{children}</>;
}

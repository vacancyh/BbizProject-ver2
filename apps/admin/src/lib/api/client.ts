/**
 * 백엔드(Medusa) API 호출 베이스 — 어드민 리플랫폼 공용 클라이언트.
 *
 * 런타임 계약(프롬프트/02_MIGRATION_DOMAIN.md §런타임):
 *  - host 백엔드 = http://localhost:7001 (컨테이너 내부 9000)
 *  - 인증 = POST /auth/user/emailpass → { token }, Authorization: Bearer, localStorage("admin_token")
 *  - 401 → /login
 *
 * 도메인 루프에서 lib/api/<domain>.ts 가 이 fetcher를 사용한다.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:7001";

const TOKEN_KEY = "admin_token";

/** 401 redirect 중복 가드 — 토스트 폭탄 방지용 모듈 스코프 flag. */
let redirecting = false;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

/** 관리자 로그인 — emailpass. 성공 시 토큰 저장. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("로그인에 실패했습니다. 이메일/비밀번호를 확인해 주세요.");
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("토큰을 받지 못했습니다.");
  setToken(data.token);
}

/** 인증 포함 fetch. 401이면 토큰 제거 후 호출측에서 /login 유도. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    // 브라우저 환경 + /login 이 아니면 즉시 /login 으로 이동(1회).
    // 페이지가 떠나면서 후속 호출의 UNAUTHORIZED 토스트 폭탄을 차단한다.
    if (
      typeof window !== "undefined" &&
      !redirecting &&
      window.location.pathname !== "/login"
    ) {
      redirecting = true;
      window.location.replace("/login?expired=1");
    }
    throw new Error("UNAUTHORIZED");
  }
  if (res.status === 403) {
    // 2FA 세션 미검증(서버측 게이팅) → 재로그인+인증 유도.
    let code: string | undefined;
    try {
      code = ((await res.clone().json()) as { code?: string })?.code;
    } catch {
      // ignore
    }
    if (code === "2FA_REQUIRED") {
      clearToken();
      if (
        typeof window !== "undefined" &&
        !redirecting &&
        window.location.pathname !== "/login"
      ) {
        redirecting = true;
        window.location.replace("/login?twofa=1");
      }
      throw new Error("2FA_REQUIRED");
    }
  }
  if (!res.ok) throw new Error(`요청 실패: ${res.status}`);
  return (await res.json()) as T;
}

// 메두사 Admin/Store API 헬퍼입니다.
// Playwright APIRequestContext 가 IPv6 [::1] 에 ECONNREFUSED 를 일으키므로
// Node native http 모듈로 직접 호출합니다. (백엔드는 IPv6-only 바인딩 = 박제 대상)
import http from "http";

export const BACKEND_HOST = "127.0.0.1";
export const BACKEND_PORT = 9000;
export const STOREFRONT_HOST = "127.0.0.1";
export const STOREFRONT_PORT = 8000;
export const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
export const STOREFRONT_URL = `http://${STOREFRONT_HOST}:${STOREFRONT_PORT}`;
export const PUBLISHABLE_KEY =
  "pk_25491a52e11d5a5d9b52344d3f0bdaaea3bd7d3d3a9b27edda84b1287147ccb4";

export const ADMIN_EMAIL = "admin@local.test";
export const ADMIN_PASSWORD = "djemalsdlqslek12!@";

// Node native http 호출 결과를 Playwright 의 APIResponse 와 유사한 인터페이스로 반환합니다.
export interface ApiResponse {
  status(): number;
  ok(): boolean;
  text(): Promise<string>;
  json(): Promise<any>;
}

function requestRaw(
  method: string,
  path: string,
  options: { host?: string; port?: number; headers?: Record<string, string>; body?: any } = {},
): Promise<ApiResponse> {
  const host = options.host ?? BACKEND_HOST;
  const port = options.port ?? BACKEND_PORT;
  const headers: Record<string, string> = {
    accept: "application/json",
    ...options.headers,
  };
  let bodyStr: string | undefined;
  if (options.body !== undefined) {
    bodyStr = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    headers["content-type"] = headers["content-type"] ?? "application/json";
    headers["content-length"] = String(Buffer.byteLength(bodyStr));
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method,
        headers,
        family: 4, // IPv4 강제 (백엔드가 dual stack tcp46 listen)
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const text = buf.toString("utf8");
          const status = res.statusCode ?? 0;
          resolve({
            status: () => status,
            ok: () => status >= 200 && status < 300,
            text: async () => text,
            json: async () => {
              try {
                return JSON.parse(text);
              } catch {
                throw new Error(`JSON parse 실패: ${text.slice(0, 300)}`);
              }
            },
          });
        });
      },
    );
    req.setTimeout(30_000, () => {
      req.destroy(new Error("request timeout 30s"));
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export async function loginAdminApi(): Promise<{ token: string }> {
  const res = await requestRaw("POST", "/auth/user/emailpass", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`Admin 로그인 실패 (${res.status()}): ${await res.text()}`);
  }
  const json = await res.json();
  const token = json.token as string;
  if (!token) {
    throw new Error(`Admin 로그인 응답에 token 없음: ${JSON.stringify(json)}`);
  }
  return { token };
}

export async function adminGet(token: string, path: string): Promise<ApiResponse> {
  return requestRaw("GET", path, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function adminPost(token: string, path: string, body: any): Promise<ApiResponse> {
  return requestRaw("POST", path, {
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
}

export async function storeGet(path: string): Promise<ApiResponse> {
  return requestRaw("GET", path, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
}

export async function storePost(path: string, body: any): Promise<ApiResponse> {
  return requestRaw("POST", path, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    body,
  });
}

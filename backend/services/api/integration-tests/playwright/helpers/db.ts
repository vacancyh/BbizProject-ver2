// Postgres 직접 조회 헬퍼입니다.
// shop-postgres 컨테이너의 5434 포트를 통해 접속합니다.
import { Client } from "pg";

export const DB_CONFIG = {
  host: "127.0.0.1",
  port: 5434,
  user: "shop",
  password: "shop_local_2026",
  database: "shop",
};

export async function withClient<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client(DB_CONFIG);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function query<R = any>(
  sql: string,
  params: any[] = [],
): Promise<R[]> {
  return withClient(async (client) => {
    const res = await client.query(sql, params);
    return res.rows as R[];
  });
}

export async function countTable(table: string): Promise<number> {
  const rows = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return parseInt(rows[0]?.count ?? "0", 10);
}

export async function tableExists(table: string): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1
     ) AS exists`,
    [table],
  );
  return rows[0]?.exists === true;
}

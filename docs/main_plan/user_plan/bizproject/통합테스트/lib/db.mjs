// DB 교차검증 헬퍼 — docker 컨테이너의 psql 로 shop_test 에 직접 질의한다.
// API 응답만 믿지 않고 실제 DB 상태를 확인하는 "다른 계층" 검증 방법.
import { execSync } from "node:child_process"

const CONTAINER = process.env.DB_CONTAINER || "shop-postgres"
const DB_NAME = process.env.DB_NAME || "shop_test"
const DB_USER = process.env.DB_USER || "shop"

/** SQL 실행 → 행 배열(각 행은 컬럼 문자열 배열). 실패 시 null. */
export function dbRows(sql) {
  try {
    const out = execSync(
      `docker exec -i ${CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -A -F"|"`,
      { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    )
    return out.trim().split("\n").filter((l) => l !== "").map((l) => l.split("|"))
  } catch (e) {
    return null
  }
}

/** 단일 스칼라(첫 행 첫 컬럼) 정수로. 실패/빈결과 시 null. */
export function dbCount(sql) {
  const rows = dbRows(sql)
  if (!rows || !rows[0]) return null
  const n = Number(rows[0][0])
  return Number.isFinite(n) ? n : rows[0][0]
}

/**
 * CSV 생성 공통 유틸 (2026-08-03 신설)
 *
 * 왜 필요한가: 운영 실무에서 주문·회원 목록을 엑셀로 뽑는 일이 상시로 발생한다
 * (세무사 전달, 택배사 대량발송 양식, 정산 대사, 마케팅 타겟 추출).
 *
 * 기존 상태(2026-08-03 확인):
 *  - 주문: 어드민 화면에 클라이언트측 CSV 생성이 이미 있었다(BOM·이스케이프 처리도 되어 있음).
 *          다만 목록 API 기준이라 컬럼이 8개뿐이고(주소·연락처·상품 없음) 최대 1,000건이었다.
 *  - 회원: "엑셀 다운로드" 버튼이 있었지만 **onClick 이 없어 눌러도 아무 일이 없었다.**
 * → 서버측 내보내기를 만들어 컬럼·건수를 늘리고, 회원 버튼을 여기에 연결했다.
 *
 * 한글 깨짐 대응: Excel 은 BOM 없는 UTF-8 CSV 를 CP949 로 읽어 한글이 깨진다.
 * 실무에서 가장 흔한 컴플레인이라 **UTF-8 BOM 을 반드시 붙인다.**
 */
import { MedusaResponse } from "@medusajs/framework/http"

/** UTF-8 BOM — Excel 이 한글을 올바로 읽게 한다(빼면 전부 깨져 보인다). */
const BOM = "﻿"

/**
 * CSV 한 칸 이스케이프.
 * 쉼표·따옴표·개행이 들어가면 따옴표로 감싸고 내부 따옴표는 두 번 쓴다(RFC 4180).
 *
 * 보안: `=`, `+`, `-`, `@` 로 시작하는 값은 Excel 이 **수식으로 실행**한다(CSV 인젝션).
 * 고객이 입력한 이름·주소가 그대로 들어가므로 앞에 작은따옴표를 붙여 무력화한다.
 */
export function cell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

/** 행 배열 → CSV 문자열(BOM 포함) */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(",")]
  for (const r of rows) lines.push(r.map(cell).join(","))
  return BOM + lines.join("\r\n")
}

/**
 * CSV 다운로드 응답 — 파일명에 날짜를 넣어 덮어쓰기 사고를 줄인다.
 *
 * ⚠️ HTTP 헤더 값에 한글을 **그대로 넣으면 Node 가 거부한다**(ERR_INVALID_CHAR → 500).
 *    실제로 겪었다. 그래서 filename= 에는 ASCII 대체 이름을,
 *    한글 이름은 RFC 5987 의 filename*= 에 퍼센트 인코딩해서 넣는다.
 *    브라우저는 filename* 을 우선 적용하므로 사용자에게는 한글 파일명으로 보인다.
 */
export function sendCsv(
  res: MedusaResponse,
  filename: string,
  csv: string,
  asciiName?: string
) {
  const stamp = new Date().toISOString().slice(0, 10)
  const korean = `${filename}-${stamp}.csv`
  const ascii = `${asciiName ?? "export"}-${stamp}.csv`
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(korean)}`
  )
  res.setHeader("Cache-Control", "no-store")
  res.status(200).send(csv)
}

/** ISO 날짜를 "YYYY-MM-DD HH:mm" (KST) 로 — 엑셀에서 바로 읽히는 형태 */
export function kstDateTime(value: unknown): string {
  if (!value) return ""
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`
}

/**
 * 기간 필터 파싱 — ?from=2026-01-01&to=2026-01-31
 * 미지정 시 null(전체). to 는 그 날 23:59:59 까지 포함한다(실무 기대와 일치).
 */
export function parsePeriod(q: Record<string, unknown>): { from: Date | null; to: Date | null } {
  const parse = (v: unknown, endOfDay = false): Date | null => {
    if (!v) return null
    const d = new Date(String(v) + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return { from: parse(q.from), to: parse(q.to, true) }
}

/** 내보내기 1회 최대 행수 — 메모리 폭주 방지(초과 시 안내). */
export const MAX_ROWS = 50_000

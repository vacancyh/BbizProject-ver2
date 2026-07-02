/**
 * 순수 JS QR 코드 생성기 (byte 모드) — 외부 의존/네트워크 0.
 * 표준(ISO/IEC 18004) 알고리즘 충실 구현. 결과를 SVG 문자열로 반환한다.
 *
 * 용도: 2FA otpauth URI QR. CSP 안전(인라인 SVG, 외부 리소스 없음).
 * 정확성은 파이썬 segno 로 동일 (version, ecc, mask) 교차검증됨.
 *
 * 알고리즘 참고: Nayuki, "QR Code generator library" (public domain) 를 TS 로 포팅.
 */

type Ecc = 0 | 1 | 2 | 3 // Low, Medium, Quartile, High
const ECC_FORMAT_BITS: Record<Ecc, number> = { 0: 1, 1: 0, 2: 3, 3: 2 }

// [ecl][version] — 블록당 ECC 코드워드 수 (index 0 = padding)
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
]
// [ecl][version] — ECC 블록 수 (index 0 = padding)
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
]

const MIN_VERSION = 1
const MAX_VERSION = 40

// ─── Reed-Solomon (GF(256), 0x11D) ──────────────────────────────────────────
function rsMultiply(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
function rsComputeDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = rsMultiply(result[j], root)
      if (j + 1 < result.length) result[j] ^= result[j + 1]
    }
    root = rsMultiply(root, 0x02)
  }
  return result
}
function rsComputeRemainder(data: number[], divisor: number[]): number[] {
  const result: number[] = new Array(divisor.length).fill(0)
  for (const b of data) {
    const factor = b ^ (result.shift() as number)
    result.push(0)
    for (let i = 0; i < result.length; i++) result[i] ^= rsMultiply(divisor[i], factor)
  }
  return result
}

// ─── 용량/버전 계산 ─────────────────────────────────────────────────────────
function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}
function getNumDataCodewords(ver: number, ecl: Ecc): number {
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver]
  )
}
function getAlignmentPatternPositions(ver: number): number[] {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const step = Math.floor((ver * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2
  const result: number[] = [6]
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

// ─── 데이터 세그먼트(byte 모드) ──────────────────────────────────────────────
function makeBytes(data: Uint8Array): { bits: number[]; charCount: number } {
  const bits: number[] = []
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  for (const b of data) append(b, 8)
  return { bits, charCount: data.length }
}

// ─── 매트릭스 그리기 ─────────────────────────────────────────────────────────
class QrGrid {
  size: number
  modules: boolean[][]
  isFunction: boolean[][]
  constructor(public version: number) {
    this.size = version * 4 + 17
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false))
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false))
  }
  setFn(x: number, y: number, dark: boolean) {
    this.modules[y][x] = dark
    this.isFunction[y][x] = true
  }
  drawFinder(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const xx = x + dx, yy = y + dy
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFn(xx, yy, dist !== 2 && dist !== 4)
        }
      }
    }
  }
  drawAlignment(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFn(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }
}

function drawFunctionPatterns(g: QrGrid, ecl: Ecc, mask: number) {
  const size = g.size
  // 타이밍 패턴
  for (let i = 0; i < size; i++) {
    g.setFn(6, i, i % 2 === 0)
    g.setFn(i, 6, i % 2 === 0)
  }
  // 파인더 3개 + 분리자
  g.drawFinder(3, 3)
  g.drawFinder(size - 4, 3)
  g.drawFinder(3, size - 4)
  // 정렬 패턴
  const alignPos = getAlignmentPatternPositions(g.version)
  const n = alignPos.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      g.drawAlignment(alignPos[i], alignPos[j])
    }
  }
  drawFormatBits(g, ecl, mask)
  drawVersion(g)
}

function drawFormatBits(g: QrGrid, ecl: Ecc, mask: number) {
  const data = (ECC_FORMAT_BITS[ecl] << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  const bits = ((data << 10) | rem) ^ 0x5412
  const getBit = (n: number, i: number) => ((n >>> i) & 1) !== 0
  // 좌상단 주변
  for (let i = 0; i <= 5; i++) g.setFn(8, i, getBit(bits, i))
  g.setFn(8, 7, getBit(bits, 6))
  g.setFn(8, 8, getBit(bits, 7))
  g.setFn(7, 8, getBit(bits, 8))
  for (let i = 9; i < 15; i++) g.setFn(14 - i, 8, getBit(bits, i))
  // 우상단 + 좌하단
  const size = g.size
  for (let i = 0; i < 8; i++) g.setFn(size - 1 - i, 8, getBit(bits, i))
  for (let i = 8; i < 15; i++) g.setFn(8, size - 15 + i, getBit(bits, i))
  g.setFn(8, size - 8, true) // 항상 검은 모듈
}

function drawVersion(g: QrGrid) {
  if (g.version < 7) return
  let rem = g.version
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  const bits = (g.version << 12) | rem
  for (let i = 0; i < 18; i++) {
    const bit = ((bits >>> i) & 1) !== 0
    const a = g.size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    g.setFn(a, b, bit)
    g.setFn(b, a, bit)
  }
}

function drawCodewords(g: QrGrid, data: number[]) {
  const size = g.size
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (!g.isFunction[y][x] && i < data.length * 8) {
          g.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0
          i++
        }
      }
    }
  }
}

function applyMask(g: QrGrid, mask: number) {
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      if (g.isFunction[y][x]) continue
      let invert = false
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break
        case 1: invert = y % 2 === 0; break
        case 2: invert = x % 3 === 0; break
        case 3: invert = (x + y) % 3 === 0; break
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break
      }
      if (invert) g.modules[y][x] = !g.modules[y][x]
    }
  }
}

function penaltyScore(g: QrGrid): number {
  const size = g.size
  const m = g.modules
  let result = 0
  // 규칙 1: 행/열 연속
  for (let y = 0; y < size; y++) {
    let run = 0, color = false
    for (let x = 0; x < size; x++) {
      if (m[y][x] === color) { run++; if (run === 5) result += 3; else if (run > 5) result++ }
      else { color = m[y][x]; run = 1 }
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 0, color = false
    for (let y = 0; y < size; y++) {
      if (m[y][x] === color) { run++; if (run === 5) result += 3; else if (run > 5) result++ }
      else { color = m[y][x]; run = 1 }
    }
  }
  // 규칙 2: 2x2 블록
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = m[y][x]
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) result += 3
    }
  }
  // 규칙 3: 파인더 유사 패턴 (1:1:3:1:1)
  const pattern = (line: boolean[]) => {
    let cnt = 0
    for (let i = 0; i <= line.length - 7; i++) {
      if (
        line[i] && !line[i + 1] && line[i + 2] && line[i + 3] && line[i + 4] && !line[i + 5] && line[i + 6]
      ) {
        const before = i >= 4 && !line[i - 1] && !line[i - 2] && !line[i - 3] && !line[i - 4]
        const after = i + 10 < line.length && !line[i + 7] && !line[i + 8] && !line[i + 9] && !line[i + 10]
        if (before || after) cnt++
      }
    }
    return cnt
  }
  for (let y = 0; y < size; y++) result += pattern(m[y]) * 40
  for (let x = 0; x < size; x++) {
    const col = m.map((row) => row[x])
    result += pattern(col) * 40
  }
  // 규칙 4: 흑백 비율
  let dark = 0
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) dark++
  const total = size * size
  const k = Math.floor((Math.abs(dark * 20 - total * 10) + total - 1) / total) - 1
  result += k * 10
  return result
}

// ─── 최상위: 텍스트 → 매트릭스 ───────────────────────────────────────────────
/** otpauth URI 등 텍스트 → QR 모듈 매트릭스(true=검정). ecl 기본 M. */
export function qrMatrix(
  text: string,
  ecl: Ecc = 1
): { modules: boolean[][]; size: number; version: number; mask: number } {
  const data = new TextEncoder().encode(text)
  const seg = makeBytes(data)

  // 들어갈 최소 버전 선택
  let version = MIN_VERSION
  for (; ; version++) {
    if (version > MAX_VERSION) throw new Error("데이터가 QR 용량을 초과했습니다.")
    const capacityBits = getNumDataCodewords(version, ecl) * 8
    // byte 모드: 모드지시자(4) + 문자수지시자(8 또는 16) + 데이터
    const ccBits = version <= 9 ? 8 : 16
    const usedBits = 4 + ccBits + seg.bits.length
    if (usedBits <= capacityBits) break
  }

  // 비트스트림 조립
  const bits: number[] = []
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  append(0x4, 4) // byte 모드 지시자
  append(seg.charCount, version <= 9 ? 8 : 16)
  for (const b of seg.bits) bits.push(b)

  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8
  append(0, Math.min(4, dataCapacityBits - bits.length)) // terminator
  while (bits.length % 8 !== 0) bits.push(0) // 바이트 정렬
  // 패딩 바이트
  for (let pad = 0xec; bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) append(pad, 8)

  // 바이트 배열로
  const dataCodewords: number[] = new Array(bits.length / 8).fill(0)
  for (let i = 0; i < bits.length; i++) dataCodewords[i >>> 3] |= bits[i] << (7 - (i & 7))

  // ECC 추가 + 인터리브
  const allCodewords = addEccAndInterleave(dataCodewords, version, ecl)

  // 마스크 8종 시도 → 최소 패널티 선택
  let bestGrid: QrGrid | null = null
  let bestMask = 0
  let minPenalty = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const g = new QrGrid(version)
    drawFunctionPatterns(g, ecl, mask)
    drawCodewords(g, allCodewords)
    applyMask(g, mask)
    const p = penaltyScore(g)
    if (p < minPenalty) { minPenalty = p; bestGrid = g; bestMask = mask }
  }
  const g = bestGrid as QrGrid
  return { modules: g.modules, size: g.size, version, mask: bestMask }
}

function addEccAndInterleave(data: number[], version: number, ecl: Ecc): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][version]
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version]
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8)
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  const shortBlockLen = Math.floor(rawCodewords / numBlocks)

  const blocks: number[][] = []
  const rsDiv = rsComputeDivisor(blockEccLen)
  let k = 0
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1)
    const dat = data.slice(k, k + datLen)
    k += datLen
    const ecc = rsComputeRemainder(dat, rsDiv)
    if (i < numShortBlocks) dat.push(0) // short block 정렬용 자리(인터리브 시 스킵)
    blocks.push(dat.concat(ecc))
  }

  const result: number[] = []
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      // short block 의 데이터부 마지막 채움칸(index shortBlockLen-blockEccLen)은 스킵
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(blocks[j][i])
      }
    }
  }
  return result
}

// ─── SVG 렌더 ────────────────────────────────────────────────────────────────
/** 텍스트 → QR SVG 문자열. border=여백 모듈수, scale=모듈 픽셀. */
export function qrSvg(text: string, opts: { border?: number; scale?: number; ecl?: Ecc } = {}): string {
  const border = opts.border ?? 4
  const scale = opts.scale ?? 4
  const { modules, size } = qrMatrix(text, opts.ecl ?? 1)
  const dim = (size + border * 2) * scale
  let path = ""
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) {
        const px = (x + border) * scale
        const py = (y + border) * scale
        path += `M${px},${py}h${scale}v${scale}h-${scale}z`
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
    `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  )
}

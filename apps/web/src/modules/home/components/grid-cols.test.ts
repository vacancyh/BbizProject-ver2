/**
 * 상품 그리드 열 수 유닛 테스트 (2026-08-03 신설)
 *
 * 왜 테스트하나: Tailwind 는 **동적 클래스명을 인식하지 못한다.**
 * `small:grid-cols-${n}` 처럼 조립하면 빌드 시 클래스가 생성되지 않아
 * 화면이 조용히 깨진다(개발 중에는 캐시 때문에 멀쩡해 보이기도 한다).
 * 그래서 정적 매핑을 쓰는데, 그 매핑이 유지되는지 테스트로 고정한다.
 */
import { describe, it, expect } from "vitest"
import { productGridClass } from "./grid-cols"

describe("productGridClass — 항목 수에 따른 열 수", () => {
  it("항목 수만큼 열을 쓰되 최대 4열이다", () => {
    expect(productGridClass(1)).toContain("small:grid-cols-1")
    expect(productGridClass(2)).toContain("small:grid-cols-2")
    expect(productGridClass(3)).toContain("small:grid-cols-3")
    expect(productGridClass(4)).toContain("small:grid-cols-4")
    expect(productGridClass(8)).toContain("small:grid-cols-4")
    expect(productGridClass(100)).toContain("small:grid-cols-4")
  })

  it("0개·음수에도 유효한 클래스를 만든다(undefined 가 섞이면 안 된다)", () => {
    for (const n of [0, -1]) {
      const cls = productGridClass(n)
      expect(cls).toContain("small:grid-cols-1")
      expect(cls).not.toContain("undefined")
    }
  })

  it("모바일은 항상 2열이다", () => {
    for (const n of [1, 3, 7]) {
      expect(productGridClass(n)).toContain("grid-cols-2")
    }
  })

  it("동적으로 조립된 클래스가 아니다 — Tailwind 가 인식할 수 있는 정적 문자열", () => {
    // small:grid-cols-N 의 N 이 1~4 안에만 있어야 한다(5, 12 같은 값이 나오면 CSS 가 없다)
    for (const n of [1, 2, 3, 4, 5, 10]) {
      const m = /small:grid-cols-(\d+)/.exec(productGridClass(n))
      expect(m).not.toBeNull()
      expect(Number(m![1])).toBeGreaterThanOrEqual(1)
      expect(Number(m![1])).toBeLessThanOrEqual(4)
    }
  })
})

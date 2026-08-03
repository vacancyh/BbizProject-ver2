import { defineConfig } from "vitest/config"
import path from "path"

/**
 * 스토어프론트 유닛 테스트 (2026-08-03 신설)
 *
 * 배경: 지금까지 스토어프론트에는 **유닛 테스트가 0개**였다. E2E 30개가 전부였는데,
 * E2E 는 느려서 가격 계산·필터 판정 같은 경계값을 촘촘히 검사할 수 없다.
 * 고객에게 잘못된 금액이 보이는 종류의 버그는 순수 로직 테스트가 가장 싸게 잡는다.
 *
 * 대상: DOM·네트워크 없이 검증 가능한 순수 함수(가격·필터·표시 규칙).
 * 컴포넌트 렌더링 테스트는 E2E 가 담당한다(중복 투자 방지).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@modules": path.resolve(__dirname, "./src/modules"),
    },
  },
})

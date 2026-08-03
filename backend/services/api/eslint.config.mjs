/**
 * 백엔드 ESLint 설정 (2026-08-03 신설)
 *
 * 배경: 스토어프론트·어드민은 `next lint` 로 커버되는데 **백엔드만 린트가 없었다.**
 * 품질 방어선이 `tsc --noEmit` + 유닛 408건뿐이었고, 타입이 맞아도 잡히지 않는
 * 실수(쓰지 않는 변수, await 누락, 빈 catch)는 그대로 통과했다.
 *
 * 규칙 선정 원칙
 *  - **실제 버그로 이어지는 것만 error.** 스타일은 사람이 판단할 몫이고,
 *    수백 건의 스타일 경고는 진짜 문제를 파묻는다(경고 피로).
 *  - 이 코드베이스는 Medusa 특성상 `any` 가 불가피한 곳이 많다
 *    (모듈 서비스 resolve, query.graph 결과). `no-explicit-any` 는 끄고
 *    대신 정말 위험한 것(floating promise, 잘못된 await)에 집중한다.
 */
import js from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    // 검사 대상 밖 — 생성물·의존성·테스트 픽스처
    ignores: [
      "node_modules/**",
      ".medusa/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "**/migrations/**", // 자동 생성 마이그레이션
      "**/.snapshot-*.json",
      "eslint.config.mjs",
      "jest.config.js",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      // ── 실제 버그로 이어지는 것 (error) ─────────────────────────────────
      // await 를 빠뜨린 Promise. 금전 처리에서 이걸 놓치면 순서가 뒤엉킨다.
      "@typescript-eslint/no-floating-promises": "error",
      // Promise 를 조건문·문자열에 그대로 쓰는 실수
      "@typescript-eslint/no-misused-promises": "error",
      // await 없는 async 반환 등
      "@typescript-eslint/await-thenable": "error",
      // 항상 참/거짓인 조건 — 대개 오타이거나 잘못된 가정
      "no-constant-condition": "error",
      // 같은 case 중복, 도달 불가 코드
      "no-duplicate-case": "error",
      "no-unreachable": "error",

      // ── 유지보수 신호 (warn — 배포를 막지는 않는다) ─────────────────────
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // ── 이 코드베이스에서는 끄는 것 ───────────────────────────────────
      // Medusa 모듈 resolve·query.graph 결과는 any 로 다루는 것이 현실적이다.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // 템플릿 문자열에 숫자·불리언을 넣는 것은 로그에서 흔하고 문제되지 않는다.
      "@typescript-eslint/restrict-template-expressions": "off",
      // 의도적으로 넓은 타입을 받는 곳이 많다.
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/unbound-method": "off",

      // ── 이 코드베이스와 충돌해서 끄는 것 (판단 근거를 남긴다) ────────────
      //
      // `req.scope.resolve(MODULE) as unknown as SomeService` 는 이 프로젝트 전반의
      // **모듈 타입 지정 관례**다(197곳). resolve() 반환이 느슨해서 ESLint 는 "불필요"로 보지만,
      // 이 단언이 곧 개발자가 서비스 메서드를 자동완성·타입검사받는 근거다.
      // 자동 수정하면 타입 정보가 통째로 사라진다 → 규칙을 끈다.
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      //
      // `let x: T | null = null` 로 선언한 뒤 try 블록에서 할당하는 패턴을 오탐한다.
      // try 밖에서 쓰려면 반드시 밖에서 선언해야 하므로 이 초기화는 필요하다.
      "no-useless-assignment": "off",
    },
  },
  {
    // Medusa 어드민 UI 확장(React). 서버 코드와 성격이 다르다 —
    // onClick/onSuccess 에 async 함수를 넘기는 것은 React 표준 패턴이라 오탐이다.
    files: ["src/admin/**"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    // 테스트 파일은 규칙을 느슨하게 — 단언·목이 많다.
    files: ["**/__tests__/**", "**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // 스크립트는 콘솔 출력이 본업이다.
    files: ["src/scripts/**"],
    rules: {
      "no-console": "off",
    },
  }
)

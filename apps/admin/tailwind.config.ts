import type { Config } from "tailwindcss";

// prototype(apps/admin/prototype/assets/styles/admin.css)의 디자인 토큰을 Tailwind 테마로 이식.
// 색/반경/그림자/폰트는 globals.css의 CSS 변수와 1:1로 매핑한다(단일 출처).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        primary: "var(--primary)",
        "primary-weak": "var(--primary-weak)",
        "primary-press": "var(--primary-press)",
        success: "var(--success)",
        "success-weak": "var(--success-weak)",
        warning: "var(--warning)",
        "warning-weak": "var(--warning-weak)",
        danger: "var(--danger)",
        "danger-weak": "var(--danger-weak)",
        info: "var(--info)",
        "info-weak": "var(--info-weak)",
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
        pill: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16,24,40,.05)",
        sm: "0 1px 3px rgba(16,24,40,.07), 0 1px 2px rgba(16,24,40,.04)",
        md: "0 4px 12px rgba(16,24,40,.08), 0 2px 4px rgba(16,24,40,.04)",
        lg: "0 16px 40px rgba(16,24,40,.16)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;

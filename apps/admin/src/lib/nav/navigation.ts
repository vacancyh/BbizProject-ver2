/**
 * 관리자 정보구조(IA) / 사이드바 네비게이션 — 단일 출처
 *
 * 기준:
 *  - 디자인 사양 = apps/admin/prototype/assets/scripts/core/admin-shell.js 의 NAV (3그룹)
 *  - 커버리지 = 프롬프트/medusa_feature_list_v1.1.md §4 (우리 메뉴 12종) + §3 양방향 갭
 *
 * gap 표기:
 *  - "B" = 우리 要求有 · Medusa core 無 → 메뉴에 GapBadge("신규기능") 노출 + custom module
 *  - "A" = Medusa 有 · 우리 자리 미정 → 신규 화면 설계까지 이전(드롭 금지). 배지는 없음
 *  - null = MATCH (Medusa 호출/래핑으로 충족)
 *
 * order = 수직 슬라이스(도메인 단위) 구현 순서 (기반→High→Medium). FEATURE_MATRIX와 정합.
 */

export type IconName =
  | "LayoutDashboard"
  | "ShoppingCart"
  | "Package"
  | "FolderTree"
  | "Users"
  | "Truck"
  | "Calculator"
  | "Ticket"
  | "BarChart3"
  | "MessageSquare"
  | "Megaphone"
  | "Settings"
  | "ShieldCheck"
  | "ScrollText"
  | "SlidersHorizontal"
  | "Layers"
  | "Store"
  | "KeyRound"
  | "GitBranch"
  | "RotateCcw"
  | "FileText"
  | "Wrench"
  | "Warehouse"
  | "MapPin"
  | "Zap"
  | "Sparkles"
  | "Headphones"
  | "Image";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  /** 미답변/미처리 건수 배지 (실데이터 연동 시 동적 치환) */
  badge?: number;
  /** 차기 구현 예정 표기 */
  soon?: boolean;
  /** 갭 유형: "B"면 GapBadge(신규기능) 노출 */
  gap?: "A" | "B" | null;
  /** 수직 슬라이스 구현 순서 */
  order: number;
};

export type NavGroup = {
  section: string;
  items: NavItem[];
};

export const NAVIGATION: NavGroup[] = [
  {
    section: "운영",
    items: [
      { id: "dashboard", label: "대시보드", href: "/dashboard", icon: "LayoutDashboard", gap: null, order: 1 },
      { id: "orders", label: "주문 관리", href: "/orders", icon: "ShoppingCart", badge: 0, gap: null, order: 2 },
      { id: "products", label: "상품 관리", href: "/products", icon: "Package", gap: null, order: 3 },
      { id: "product-curation", label: "상품 통계·큐레이션", href: "/product-curation", icon: "Sparkles", gap: "B", order: 3 },
      { id: "time-sales", label: "타임세일", href: "/time-sales", icon: "Zap", gap: "B", order: 3 },
      { id: "product-types", label: "상품 분류 체계", href: "/product-types", icon: "Layers", gap: "B", order: 3 },
      { id: "categories", label: "카테고리", href: "/categories", icon: "FolderTree", gap: "A", order: 4 },
      { id: "members", label: "회원 관리", href: "/members", icon: "Users", gap: null, order: 5 },
      { id: "shipping", label: "배송 관리", href: "/shipping", icon: "Truck", gap: null, order: 6 },
      { id: "warehouse", label: "창고 관리", href: "/warehouse", icon: "Warehouse", gap: null, order: 6 },
      { id: "shipping-policy", label: "배송정책 관리", href: "/shipping-policy", icon: "MapPin", gap: null, order: 6 },
    ],
  },
  {
    section: "매출 · 마케팅",
    items: [
      { id: "settlement", label: "정산 관리", href: "/settlement", icon: "Calculator", gap: "B", order: 7 },
      { id: "coupons", label: "쿠폰·프로모션", href: "/coupons", icon: "Ticket", gap: null, order: 8 },
      { id: "marketing", label: "마케팅", href: "/marketing", icon: "Megaphone", gap: "B", order: 11 },
      { id: "stats", label: "통계·리포트", href: "/stats", icon: "BarChart3", gap: "B", order: 10 },
    ],
  },
  {
    section: "고객 · 설정",
    items: [
      { id: "reviews", label: "리뷰·문의", href: "/reviews", icon: "MessageSquare", badge: 0, gap: "B", order: 9 },
      { id: "settings", label: "쇼핑몰 설정", href: "/settings", icon: "Settings", gap: null, order: 12 },
      { id: "channels", label: "판매채널", href: "/settings/channels", icon: "Store", gap: null, order: 13 },
      { id: "api-keys", label: "API 연동키", href: "/api-keys", icon: "KeyRound", gap: null, order: 14 },
      { id: "workflow-logs", label: "워크플로우 로그", href: "/settings/workflow-logs", icon: "GitBranch", gap: null, order: 15 },
      { id: "reasons", label: "반품·환불 사유", href: "/settings/reasons", icon: "RotateCcw", gap: null, order: 16 },
      { id: "legal-docs", label: "약관 관리", href: "/settings/legal-docs", icon: "FileText", gap: null, order: 17 },
      { id: "customer-service", label: "고객센터 콘텐츠", href: "/settings/customer-service", icon: "Headphones", gap: null, order: 18 },
      { id: "banners", label: "배너·팝업", href: "/settings/banners", icon: "Image", gap: null, order: 19 },
      { id: "home-curation", label: "홈 큐레이션", href: "/settings/home-curation", icon: "Sparkles", gap: null, order: 20 },
      { id: "maintenance", label: "점검 모드", href: "/settings/maintenance", icon: "Wrench", gap: null, order: 21 },
      { id: "security-2fa", label: "2단계 인증(2FA)", href: "/settings/security", icon: "ShieldCheck", gap: null, order: 22 },
    ],
  },
  {
    // 기반(횡단) 도메인 — 모든 도메인이 의존. ② 루프 0순위로 구현 완료.
    section: "기반 · 권한",
    items: [
      { id: "permissions", label: "권한 관리", href: "/permissions", icon: "ShieldCheck", gap: "B", order: 0 },
      { id: "audit-logs", label: "감사 로그", href: "/audit-logs", icon: "ScrollText", gap: "B", order: 0 },
      { id: "policies", label: "정책 관리", href: "/policies", icon: "SlidersHorizontal", gap: "B", order: 0 },
    ],
  },
];

/** 라우트 id → 한글 타이틀 */
export const ROUTE_TITLES: Record<string, string> = Object.fromEntries(
  NAVIGATION.flatMap((g) => g.items).map((it) => [it.id, it.label])
);

/** 평면 항목 목록 (구현 순서 정렬) */
export const NAV_ITEMS_ORDERED: NavItem[] = NAVIGATION.flatMap((g) => g.items).sort(
  (a, b) => a.order - b.order
);

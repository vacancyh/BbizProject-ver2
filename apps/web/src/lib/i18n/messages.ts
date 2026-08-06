/**
 * 화면 문구(UI 라벨) — 한국어 / 영어 (2026-08-05 신설)
 *
 * ── 여기에 넣는 것 / 안 넣는 것 ────────────────────────────────────────────
 * ✅ 넣는 것: 버튼·안내문·에러 문구·폼 라벨처럼 **코드에 고정된 화면 문구**
 * ❌ 안 넣는 것: 상품명·카테고리명·공지·FAQ·배너 문구
 *      → 이건 **운영자가 관리자 화면에서 입력**한다(콘텐츠 번역).
 *        상품을 올릴 때마다 개발자가 코드를 고칠 수는 없기 때문이다.
 *
 * ── 언어 결정 ──────────────────────────────────────────────────────────────
 * 콘텐츠 번역과 **같은 스위치**를 쓴다 — `_medusa_locale` 쿠키.
 * 언어 선택을 한 번 바꾸면 상품명과 화면 문구가 함께 바뀐다.
 *
 * ── 키 규칙 ────────────────────────────────────────────────────────────────
 * `영역.항목` 형태의 평평한 키. 중첩하지 않는다 —
 * 중첩하면 타입은 예뻐지지만 "이 문구가 어디에 쓰이나"를 grep 으로 못 찾는다.
 *
 * 새 키를 추가할 때는 **ko 와 en 을 함께** 채운다.
 * en 이 비면 타입 에러가 나므로 빠뜨릴 수 없다(아래 Messages 타입).
 */

export const ko = {
  // ── 공통 ────────────────────────────────────────────────────────────────
  "common.loading": "불러오는 중…",
  "common.error": "문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  "common.retry": "다시 시도",
  "common.close": "닫기",
  "common.cancel": "취소",
  "common.confirm": "확인",
  "common.save": "저장",
  "common.delete": "삭제",
  "common.edit": "수정",
  "common.search": "검색",
  "common.required": "필수",
  "common.optional": "선택",
  "common.back": "뒤로",
  "common.next": "다음",
  "common.viewAll": "전체 보기",
  "common.won": "원",

  // ── 헤더 · 내비게이션 ────────────────────────────────────────────────────
  "nav.home": "홈",
  "nav.store": "전체 상품",
  "nav.cart": "장바구니",
  "nav.cartWithCount": "장바구니 ({count})",
  "nav.goToCart": "장바구니로 이동",
  "nav.account": "내 계정",
  "nav.login": "로그인",
  "nav.logout": "로그아웃",
  "nav.search": "검색",
  "nav.menu": "메뉴",
  "nav.customerService": "고객센터",
  "nav.wishlist": "찜한 상품",
  "nav.orderLookup": "비회원 주문조회",

  // ── 상품 목록 ────────────────────────────────────────────────────────────
  "store.title": "전체 상품",
  "store.empty": "표시할 상품이 없습니다.",
  "store.sortBy": "정렬",
  "store.sort.latest": "신상품순",
  "store.sort.priceAsc": "낮은 가격순",
  "store.sort.priceDesc": "높은 가격순",
  "store.filter": "필터",
  "store.filter.price": "가격",
  "store.filter.reset": "초기화",
  "store.resultCount": "총 {count}개",

  // ── 상품 상세 ────────────────────────────────────────────────────────────
  "product.addToCart": "장바구니에 담기",
  "product.buyNow": "바로 구매",
  "product.soldOut": "품절",
  "product.lowStock": "품절 임박",
  "product.selectOption": "옵션을 선택하세요",
  "product.quantity": "수량",
  "product.description": "상품 설명",
  "product.reviews": "리뷰",
  "product.inquiries": "상품 문의",
  "product.shippingInfo": "배송 정보",
  "product.addedToCart": "장바구니에 담았습니다.",
  "product.addToCartFailed": "장바구니에 담지 못했습니다. 잠시 후 다시 시도해 주세요.",
  "product.outOfStockMessage": "재고가 부족합니다.",

  // ── 장바구니 ─────────────────────────────────────────────────────────────
  "cart.title": "장바구니",
  "cart.empty": "장바구니가 비어 있습니다",
  "cart.emptyHint": "마음에 드는 상품을 담아보세요. 로그인하면 담은 상품이 다음 방문에도 유지됩니다.",
  "cart.browseAll": "전체 상품 보기",
  "cart.browseNew": "신상품 둘러보기",
  "cart.emptyAction": "쇼핑 계속하기",
  "cart.item": "상품",
  "cart.price": "가격",
  "cart.quantity": "수량",
  "cart.subtotal": "상품 금액",
  "cart.shipping": "배송비",
  "cart.discount": "할인",
  "cart.total": "결제 예정 금액",
  "cart.checkout": "주문하기",
  "cart.remove": "삭제",
  "cart.removed": "장바구니에서 삭제했습니다.",

  // ── 주문 · 결제 ──────────────────────────────────────────────────────────
  "checkout.title": "주문/결제",
  "checkout.shippingAddress": "배송지",
  "checkout.deliveryMethod": "배송 방법",
  "checkout.payment": "결제 수단",
  "checkout.review": "주문 확인",
  "checkout.placeOrder": "결제하기",
  "checkout.orderSummary": "주문 요약",
  "checkout.usePoints": "적립금 사용",
  "checkout.pointsBalance": "보유 적립금",
  "checkout.coupon": "쿠폰",
  "checkout.applyCoupon": "적용",
  "checkout.orderComplete": "주문이 완료되었습니다.",
  "checkout.orderNumber": "주문번호",

  // ── 계정 ─────────────────────────────────────────────────────────────────
  "account.login": "로그인",
  "account.welcomeBack": "다시 오신 것을 환영합니다",
  "account.loginHint": "로그인하시면 더 편리한 쇼핑을 즐기실 수 있습니다.",
  "account.emailInvalid": "올바른 이메일 주소를 입력하세요.",
  "account.register": "회원가입",
  "account.registerHint": "회원으로 가입하시고 더 편리한 쇼핑 혜택을 누려보세요.",
  "account.firstName": "이름",
  "account.lastName": "성",
  "account.passwordRule": "8자 이상, 영문과 숫자를 포함해 주세요.",
  "account.passwordRuleHint": "비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.",
  "account.agreePrefix": "가입 시",
  "account.privacyPolicy": "개인정보처리방침",
  "account.agreeMiddle": "및",
  "account.termsOfUse": "이용약관",
  "account.agreeSuffix": "에 동의하게 됩니다.",
  "account.submitRegister": "가입하기",
  "account.email": "이메일",
  "account.password": "비밀번호",
  "account.passwordConfirm": "비밀번호 확인",
  "account.name": "이름",
  "account.phone": "휴대폰 번호",
  "account.loginFailed": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "account.noAccount": "아직 회원이 아니신가요?",
  "account.hasAccount": "이미 회원이신가요?",
  "account.forgotPassword": "비밀번호를 잊으셨나요?",
  "account.myPage": "마이페이지",
  "account.orders": "주문 내역",
  "account.addresses": "배송지 관리",
  "account.points": "적립금",
  "account.membership": "등급",
  "account.profile": "회원 정보",
  "account.coupons": "쿠폰",
  "account.consents": "약관 동의",

  // ── 소셜 로그인(데모) ────────────────────────────────────────────────────
  "social.divider": "간편 로그인",
  "social.demoWarning1": "⚠️ 데모용입니다. 실제 카카오·네이버 인증이 아니며,",
  "social.demoWarning2": " 누르면 모든 방문자가 같은 데모 계정으로 로그인",
  "social.demoWarning3": "됩니다.",
  "social.demoNote": "운영 배포 시에는 이 영역이 표시되지 않습니다(OAuth 연동 후 교체).",
  "social.signingIn": "로그인 중...",
  "social.kakao": "카카오로 시작하기 (데모)",
  "social.naver": "네이버로 시작하기 (데모)",

  // ── 폼 검증 ──────────────────────────────────────────────────────────────
  "validation.required": "필수 입력 항목입니다.",
  "validation.email": "올바른 이메일 형식이 아닙니다.",
  "validation.passwordShort": "비밀번호는 8자 이상이어야 합니다.",
  "validation.passwordMismatch": "비밀번호가 일치하지 않습니다.",
  "validation.phone": "올바른 휴대폰 번호가 아닙니다.",
} as const

/** ko 의 키를 그대로 가져야 한다 — 빠뜨리면 타입 에러가 난다. */
export type MessageKey = keyof typeof ko
export type Messages = Record<MessageKey, string>

export const en: Messages = {
  // ── common ──────────────────────────────────────────────────────────────
  "common.loading": "Loading…",
  "common.error": "Something went wrong. Please try again.",
  "common.retry": "Try again",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.search": "Search",
  "common.required": "Required",
  "common.optional": "Optional",
  "common.back": "Back",
  "common.next": "Next",
  "common.viewAll": "View all",
  "common.won": "KRW",

  // ── nav ─────────────────────────────────────────────────────────────────
  "nav.home": "Home",
  "nav.store": "All products",
  "nav.cart": "Cart",
  "nav.cartWithCount": "Cart ({count})",
  "nav.goToCart": "Go to cart",
  "nav.account": "My account",
  "nav.login": "Sign in",
  "nav.logout": "Sign out",
  "nav.search": "Search",
  "nav.menu": "Menu",
  "nav.customerService": "Customer service",
  "nav.wishlist": "Wishlist",
  "nav.orderLookup": "Guest order lookup",

  // ── store ───────────────────────────────────────────────────────────────
  "store.title": "All products",
  "store.empty": "No products to show.",
  "store.sortBy": "Sort",
  "store.sort.latest": "Newest",
  "store.sort.priceAsc": "Price: low to high",
  "store.sort.priceDesc": "Price: high to low",
  "store.filter": "Filter",
  "store.filter.price": "Price",
  "store.filter.reset": "Reset",
  "store.resultCount": "{count} items",

  // ── product ─────────────────────────────────────────────────────────────
  "product.addToCart": "Add to cart",
  "product.buyNow": "Buy now",
  "product.soldOut": "Sold out",
  "product.lowStock": "Low stock",
  "product.selectOption": "Please select an option",
  "product.quantity": "Quantity",
  "product.description": "Description",
  "product.reviews": "Reviews",
  "product.inquiries": "Product Q&A",
  "product.shippingInfo": "Shipping",
  "product.addedToCart": "Added to cart.",
  "product.addToCartFailed": "Could not add to cart. Please try again.",
  "product.outOfStockMessage": "Not enough stock.",

  // ── cart ────────────────────────────────────────────────────────────────
  "cart.title": "Cart",
  "cart.empty": "Your cart is empty",
  "cart.emptyHint":
    "Add something you like. Sign in and your cart will still be here next time.",
  "cart.browseAll": "Browse all products",
  "cart.browseNew": "See what's new",
  "cart.emptyAction": "Continue shopping",
  "cart.item": "Item",
  "cart.price": "Price",
  "cart.quantity": "Qty",
  "cart.subtotal": "Subtotal",
  "cart.shipping": "Shipping",
  "cart.discount": "Discount",
  "cart.total": "Total",
  "cart.checkout": "Checkout",
  "cart.remove": "Remove",
  "cart.removed": "Removed from cart.",

  // ── checkout ────────────────────────────────────────────────────────────
  "checkout.title": "Checkout",
  "checkout.shippingAddress": "Shipping address",
  "checkout.deliveryMethod": "Delivery method",
  "checkout.payment": "Payment",
  "checkout.review": "Review",
  "checkout.placeOrder": "Place order",
  "checkout.orderSummary": "Order summary",
  "checkout.usePoints": "Use points",
  "checkout.pointsBalance": "Points balance",
  "checkout.coupon": "Coupon",
  "checkout.applyCoupon": "Apply",
  "checkout.orderComplete": "Your order is complete.",
  "checkout.orderNumber": "Order number",

  // ── account ─────────────────────────────────────────────────────────────
  "account.login": "Sign in",
  "account.welcomeBack": "Welcome back",
  "account.loginHint": "Sign in for a smoother shopping experience.",
  "account.emailInvalid": "Please enter a valid email address.",
  "account.register": "Create account",
  "account.registerHint": "Create an account for a smoother shopping experience.",
  "account.firstName": "First name",
  "account.lastName": "Last name",
  "account.passwordRule": "At least 8 characters, including letters and numbers.",
  "account.passwordRuleHint": "Password must be at least 8 characters and include letters and numbers.",
  "account.agreePrefix": "By signing up you agree to our",
  "account.privacyPolicy": "Privacy Policy",
  "account.agreeMiddle": "and",
  "account.termsOfUse": "Terms of Use",
  "account.agreeSuffix": ".",
  "account.submitRegister": "Create account",
  "account.email": "Email",
  "account.password": "Password",
  "account.passwordConfirm": "Confirm password",
  "account.name": "Name",
  "account.phone": "Mobile number",
  "account.loginFailed": "Email or password is incorrect.",
  "account.noAccount": "Don't have an account?",
  "account.hasAccount": "Already have an account?",
  "account.forgotPassword": "Forgot your password?",
  "account.myPage": "My page",
  "account.orders": "Orders",
  "account.addresses": "Addresses",
  "account.points": "Points",
  "account.membership": "Membership",
  "account.profile": "Profile",
  "account.coupons": "Coupons",
  "account.consents": "Consents",

  // ── social (demo) ───────────────────────────────────────────────────────
  "social.divider": "Quick sign-in",
  "social.demoWarning1": "⚠️ Demo only. This is not real Kakao/Naver authentication, and",
  "social.demoWarning2": " every visitor signs in to the same demo account",
  "social.demoWarning3": ".",
  "social.demoNote": "This section is hidden in production (replaced once OAuth is connected).",
  "social.signingIn": "Signing in…",
  "social.kakao": "Continue with Kakao (demo)",
  "social.naver": "Continue with Naver (demo)",

  // ── validation ──────────────────────────────────────────────────────────
  "validation.required": "This field is required.",
  "validation.email": "Please enter a valid email address.",
  "validation.passwordShort": "Password must be at least 8 characters.",
  "validation.passwordMismatch": "Passwords do not match.",
  "validation.phone": "Please enter a valid mobile number.",
}

/** 지원 UI 언어. 콘텐츠 로케일(ko-KR/en-US)의 앞부분과 맞춘다. */
export const UI_LOCALES = { ko, en } satisfies Record<string, Messages>
export type UiLocale = keyof typeof UI_LOCALES

export const DEFAULT_UI_LOCALE: UiLocale = "ko"

/**
 * 콘텐츠 로케일("en-US")에서 UI 언어("en")를 고른다.
 * 모르는 언어면 기본(한국어) — 화면이 비는 것보다 낫다.
 */
export function toUiLocale(localeCode: string | null | undefined): UiLocale {
  const lang = (localeCode ?? "").split(/[-_]/)[0]?.toLowerCase()
  return lang && lang in UI_LOCALES ? (lang as UiLocale) : DEFAULT_UI_LOCALE
}

// ── 아래는 서버·클라이언트가 함께 쓰는 부분 ─────────────────────────────────
// ⚠️ 이 파일에는 `next/headers` 같은 **서버 전용 모듈을 import 하지 말 것.**
//    클라이언트 컴포넌트가 여기를 import 하므로, 서버 전용이 섞이면
//    "server-only module in client bundle" 로 화면이 500 이 된다(2026-08-05 실제 발생).

/** `{name}` 자리표시자를 값으로 바꾼다. 값이 없으면 자리표시자를 그대로 둔다. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole
  )
}

export type TFunction = (
  key: MessageKey,
  vars?: Record<string, string | number>
) => string

/** 주어진 언어의 번역 함수를 만든다. 번역이 비면 기본 언어로 떨어진다. */
export function makeT(locale: UiLocale): TFunction {
  const messages = UI_LOCALES[locale] ?? UI_LOCALES[DEFAULT_UI_LOCALE]
  const fallback = UI_LOCALES[DEFAULT_UI_LOCALE]
  // 빈 버튼이 뜨는 것보다 한국어가 보이는 편이 낫다
  return (key, vars) => interpolate(messages[key] || fallback[key] || key, vars)
}

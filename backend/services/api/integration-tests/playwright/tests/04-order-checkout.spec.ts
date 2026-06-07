// 시나리오 4 = 주문 + 결제 (Store API)
// Node native http 헬퍼 사용 (IPv6-only 백엔드 이슈 우회)
import { test, expect } from "@playwright/test";
import { storeGet, storePost } from "../helpers/api";

test.describe("시나리오 4 = 주문 + 결제", () => {
  test("Store API 통해 cart 생성 → order 완료", async ({ page }) => {
    // 1) region 조회
    const regionRes = await storeGet("/store/regions");
    expect(regionRes.ok(), `regions 조회 실패 ${regionRes.status()}`).toBeTruthy();
    const regionJson = await regionRes.json();
    // product 가 KRW 가격 미보유 = 기존 default seed (EU/EUR) region 선택. 한국 region 의 KRW price 는 별도 사이클.
    const region = regionJson.regions?.find((r: any) => r.currency_code === "eur") ?? regionJson.regions?.[0];
    expect(region, "region 이 1개 이상 있어야 합니다").toBeTruthy();
    const regionCountry = region?.countries?.[0]?.iso_2 ?? "dk";
    console.log(`[시나리오 4] region.id = ${region.id} currency=${region.currency_code}`);

    // 2) product + variant 조회
    const prodRes = await storeGet("/store/products?limit=1&fields=*variants");
    expect(prodRes.ok(), `products 조회 실패 ${prodRes.status()}`).toBeTruthy();
    const prodJson = await prodRes.json();
    const product = prodJson.products?.[0];
    expect(product, "상품 1개 이상 필요").toBeTruthy();
    const variant = product.variants?.[0];
    expect(variant, "variant 1개 이상 필요").toBeTruthy();
    console.log(`[시나리오 4] variant.id = ${variant.id}`);

    // 3) cart 생성
    const cartRes = await storePost("/store/carts", {
      region_id: region.id,
      email: "test@example.com",
    });
    expect(cartRes.ok(), `cart 생성 실패 ${cartRes.status()} ${await cartRes.text()}`).toBeTruthy();
    const cart = (await cartRes.json()).cart;
    console.log(`[시나리오 4] cart.id = ${cart.id}`);

    // 4) line item 추가
    const itemRes = await storePost(`/store/carts/${cart.id}/line-items`, {
      variant_id: variant.id,
      quantity: 1,
    });
    expect(itemRes.ok(), `line-item 추가 실패 ${itemRes.status()} ${await itemRes.text()}`).toBeTruthy();

    // 5) 주소 설정
    const addrRes = await storePost(`/store/carts/${cart.id}`, {
      email: "test@example.com",
      shipping_address: {
        first_name: "테스트",
        last_name: "고객",
        address_1: "서울시 강남구 테스트로 1",
        city: "서울",
        country_code: regionCountry,
        postal_code: "06000",
        phone: "01012345678",
      },
      billing_address: {
        first_name: "테스트",
        last_name: "고객",
        address_1: "서울시 강남구 테스트로 1",
        city: "서울",
        country_code: regionCountry,
        postal_code: "06000",
        phone: "01012345678",
      },
    });
    expect(addrRes.ok(), `주소 설정 실패 ${addrRes.status()} ${await addrRes.text()}`).toBeTruthy();

    // 6) shipping option 조회
    const soRes = await storeGet(`/store/shipping-options?cart_id=${cart.id}`);
    expect(soRes.ok(), `shipping-options 조회 실패 ${soRes.status()}`).toBeTruthy();
    const soJson = await soRes.json();
    const shippingOption = soJson.shipping_options?.[0];
    expect(shippingOption, "shipping_option 1개 이상 필요").toBeTruthy();

    const smRes = await storePost(`/store/carts/${cart.id}/shipping-methods`, {
      option_id: shippingOption.id,
    });
    expect(smRes.ok(), `shipping-method 설정 실패 ${smRes.status()} ${await smRes.text()}`).toBeTruthy();

    // 7) payment collection
    const pcRes = await storePost("/store/payment-collections", { cart_id: cart.id });
    expect(pcRes.ok(), `payment-collection 생성 실패 ${pcRes.status()} ${await pcRes.text()}`).toBeTruthy();
    const paymentCollectionId = (await pcRes.json()).payment_collection.id;

    // 8) payment session (manual provider)
    const psRes = await storePost(
      `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
      { provider_id: "pp_system_default" },
    );
    const psBody = await psRes.text();
    expect(psRes.ok(), `payment-session 생성 실패 ${psRes.status()} ${psBody.slice(0, 300)}`).toBeTruthy();

    // 9) cart complete
    const completeRes = await storePost(`/store/carts/${cart.id}/complete`, {});
    const completeBody = await completeRes.text();
    expect(
      completeRes.ok(),
      `cart complete 실패 ${completeRes.status()} ${completeBody.slice(0, 500)}`,
    ).toBeTruthy();
    const completeJson = JSON.parse(completeBody);
    const orderId = completeJson.order?.id;
    console.log(`[시나리오 4] order.id = ${orderId}`);

    expect(orderId, "주문이 생성되어 order.id 가 있어야 합니다").toBeTruthy();

    await page.goto("http://127.0.0.1:8000/").catch(() => {});
    await page.screenshot({ path: "/tmp/playwright-shop/screenshots/04-order-complete.png", fullPage: true }).catch(() => {});
  });
});

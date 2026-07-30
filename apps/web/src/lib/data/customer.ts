"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()

    return createdCustomer
  } catch (error) {
    return String(error)
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error) {
    return String(error)
  }

  try {
    await transferCart()
  } catch (error) {
    return String(error)
  }

  // 게스트(쿠키) 위시리스트를 서버로 머지(로그인 전 찜한 상품 보존)
  try {
    const { mergeGuestWishlistToServer } = await import("./wishlist")
    await mergeGuestWishlistToServer()
  } catch {
    // 비치명적
  }
}

/**
 * 소셜 로그인 (MOCK) — 실제 운영 시 카카오/네이버 OAuth 로 교체.
 * 현재는 provider별 데모 계정으로 로그인(없으면 가입)해 흐름을 시연한다.
 * TODO(prod): NEXT_PUBLIC OAuth 앱키 + /auth/customer/{provider} 콜백 연동.
 */
export async function socialLoginMock(
  countryCode: string,
  provider: "kakao" | "naver"
) {
  const email = `${provider}-demo@kr-demo.local`
  const password = `${provider}demo1234!`
  const label = provider === "kakao" ? "카카오" : "네이버"

  try {
    const token = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    })
    await setAuthToken(token as string)
  } catch {
    // 데모 계정이 없으면 가입 후 로그인
    try {
      const regToken = await sdk.auth.register("customer", "emailpass", {
        email,
        password,
      })
      await setAuthToken(regToken as string)
      await sdk.store.customer.create(
        { email, first_name: label, last_name: "회원" },
        {},
        { ...(await getAuthHeaders()) }
      )
      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })
      await setAuthToken(loginToken as string)
    } catch (e) {
      return String(e)
    }
  }

  const tag = await getCacheTag("customers")
  revalidateTag(tag)
  redirect(`/${countryCode}/account`)
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/${countryCode}/account`)
}

/** 회원 탈퇴 — 본인 계정 소프트 삭제 후 로그아웃. */
export async function withdrawAccount(countryCode: string) {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/customers/me/withdraw`, {
      method: "POST",
      headers,
      body: {},
    })
  } catch (e) {
    return String(e)
  }

  try {
    await sdk.auth.logout()
  } catch {
    // 로그아웃 실패해도 토큰 제거 진행
  }
  await removeAuthToken()
  const tag = await getCacheTag("customers")
  revalidateTag(tag)
  await removeCartId()

  redirect(`/${countryCode}`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

/** 기본 배송지로 설정. */
export const setDefaultShippingAddress = async (
  addressId: string
): Promise<{ success: boolean }> => {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.store.customer.updateAddress(
      addressId,
      { is_default_shipping: true } as HttpTypes.StoreUpdateCustomerAddress,
      {},
      headers
    )
    const tag = await getCacheTag("customers")
    revalidateTag(tag)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

/**
 * 로그인 이메일 변경 (2026-07-29 신설)
 *
 * 이메일은 로그인 아이디를 겸하므로 고객 레코드와 인증 자격을 함께 갱신해야 한다.
 * 백엔드 전용 라우트(`/store/customers/me/email`)가 그 처리를 담당한다.
 * 기존 화면은 아무 것도 하지 않고 성공 메시지만 띄웠다("지원 안 됨" 주석) — 실제 동작으로 교체.
 */
export async function changeEmail(
  newEmail: string,
  currentPassword: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await sdk.client.fetch<{ ok: boolean; email: string }>(
      "/store/customers/me/email",
      {
        method: "POST",
        body: { new_email: newEmail, current_password: currentPassword },
        headers: { ...(await getAuthHeaders()) },
      }
    )
    return { ok: true, email: res?.email ?? newEmail }
  } catch (e: unknown) {
    return {
      ok: false,
      error:
        (e as { message?: string })?.message ??
        "이메일 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }
}

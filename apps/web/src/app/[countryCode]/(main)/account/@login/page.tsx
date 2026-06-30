import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "로그인",
  description: "쇼핑몰 계정으로 로그인하세요.",
}

export default function Login() {
  return <LoginTemplate />
}

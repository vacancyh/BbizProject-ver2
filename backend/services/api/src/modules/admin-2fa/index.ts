import { Module } from "@medusajs/framework/utils"
import Admin2faModuleService from "./service"

export const ADMIN_2FA_MODULE = "admin2fa"

export default Module(ADMIN_2FA_MODULE, {
  service: Admin2faModuleService,
})

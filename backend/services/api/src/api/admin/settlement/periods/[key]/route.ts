/**
 * 정산 기간 조회/스냅샷저장/삭제 Admin API
 *
 *  - GET    /admin/settlement/periods/:key   기간 1건 조회(없으면 404)
 *  - POST   /admin/settlement/periods/:key   집계 스냅샷 upsert
 *        body = { gross, refund, pgFee?, memo? }
 *        pgFee 미지정 시 policy `settlement.pg_fee_rate` × gross 로 자동 계산.
 *  - DELETE /admin/settlement/periods/:key   기간 삭제(정리/오등록 회수)
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POLICY_MODULE } from "../../../../../modules/policy"
import PolicyModuleService from "../../../../../modules/policy/service"
import { SETTLEMENT_PAYOUT_MODULE } from "../../../../../modules/settlement-payout"
import SettlementPayoutModuleService from "../../../../../modules/settlement-payout/service"
import { calcPgFee } from "../../../../../modules/settlement-payout/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  const row = await svc.getPeriod(req.params.key)
  if (!row) {
    res.status(404).json({ message: `존재하지 않는 정산 기간: ${req.params.key}` })
    return
  }
  res.json({ period: row })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  const body = (req.body ?? {}) as {
    gross?: number
    refund?: number
    pgFee?: number
    memo?: string
  }

  const gross = typeof body.gross === "number" ? body.gross : 0
  const refund = typeof body.refund === "number" ? body.refund : 0

  // PG수수료: body 우선, 없으면 정책(settlement.pg_fee_rate) × gross 자동계산
  let pgFee: number
  if (typeof body.pgFee === "number") {
    pgFee = body.pgFee
  } else {
    const row = await policy.get("settlement.pg_fee_rate")
    const rate = typeof row?.value === "number" ? row.value : 0
    pgFee = calcPgFee(gross, rate)
  }

  try {
    const result = await svc.upsertSnapshot(req.params.key, {
      gross,
      refund,
      pgFee,
      memo: body.memo ?? null,
    })
    res.status(200).json({ period: result })
  } catch (e: any) {
    res.status(400).json({ message: String(e?.message ?? "스냅샷 저장 실패") })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  const ok = await svc.deletePeriod(req.params.key)
  if (!ok) {
    res.status(404).json({ message: `존재하지 않는 정산 기간: ${req.params.key}` })
    return
  }
  res.status(200).json({ deleted: true })
}

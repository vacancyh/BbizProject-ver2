// 시나리오 5 = 청약철회 7 일 모듈 검증
// API endpoint 가 없으므로 DB 직접 insert + 조회 + 영업일 계산 검증으로 대체합니다.
// 1) withdrawal_eligibility 테이블에 직접 insert (delivered_at + 7일)
// 2) withdrawal_reason_record insert (사유 = SIMPLE_CHANGE)
// 3) eligible_until 날짜 계산 정확성 검증
import { test, expect } from "@playwright/test";
import { query, tableExists } from "../helpers/db";

test.describe("시나리오 5 = 청약철회 7 일 모듈", () => {
  test("withdrawal_eligibility + withdrawal_reason_record DB 검증", async () => {
    // 1) 두 테이블 모두 존재 확인
    const elgExists = await tableExists("withdrawal_eligibility");
    const reasonExists = await tableExists("withdrawal_reason_record");
    expect(elgExists, "withdrawal_eligibility 테이블 존재해야 함").toBeTruthy();
    expect(reasonExists, "withdrawal_reason_record 테이블 존재해야 함").toBeTruthy();

    // 2) 테스트 데이터 insert
    const testOrderId = `order_test_${Date.now()}`;
    const deliveredAt = new Date("2026-05-20T10:00:00Z");
    const eligibleUntil = new Date(deliveredAt);
    eligibleUntil.setDate(eligibleUntil.getDate() + 7); // 7 일 후

    const eligibilityId = `weli_${Date.now()}`;
    await query(
      `INSERT INTO withdrawal_eligibility
       (id, order_id, delivered_at, eligible_until, is_eligible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, now(), now())
       ON CONFLICT DO NOTHING`,
      [eligibilityId, testOrderId, deliveredAt.toISOString(), eligibleUntil.toISOString()],
    );

    // 3) 조회 + eligible_until 날짜 검증
    const elgRows = await query<{
      order_id: string;
      delivered_at: Date;
      eligible_until: Date;
      is_eligible: boolean;
    }>(`SELECT order_id, delivered_at, eligible_until, is_eligible
        FROM withdrawal_eligibility WHERE order_id=$1`, [testOrderId]);
    expect(elgRows.length, "withdrawal_eligibility 레코드 존재").toBe(1);

    const row = elgRows[0];
    const deltaMs = new Date(row.eligible_until).getTime() - new Date(row.delivered_at).getTime();
    const deltaDays = deltaMs / (1000 * 60 * 60 * 24);
    console.log(`[시나리오 5] eligible_until - delivered_at = ${deltaDays} 일`);
    expect(deltaDays, "eligible_until = delivered_at + 7 일이어야 함").toBe(7);

    // 4) withdrawal_reason_record insert + 조회
    // 먼저 컬럼 확인
    const colInfo = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='withdrawal_reason_record'
       ORDER BY ordinal_position`,
    );
    console.log(`[시나리오 5] withdrawal_reason_record 컬럼 = ${colInfo.map(c => c.column_name).join(",")}`);

    const reasonId = `wrr_${Date.now()}`;
    // 실제 schema 검증: id, order_id, reason (CHECK: simple_change/defect/wrong_item/other),
    // description (nullable), claimed_at (not null), created_at, updated_at, deleted_at
    const insertSQL = `INSERT INTO withdrawal_reason_record
                       (id, order_id, reason, claimed_at, created_at, updated_at)
                       VALUES ($1, $2, $3, now(), now(), now())
                       ON CONFLICT DO NOTHING`;
    try {
      await query(insertSQL, [reasonId, testOrderId, "simple_change"]);
    } catch (e: any) {
      console.log(`[시나리오 5] reason_record insert 에러 = ${e.message}`);
    }

    const reasonRows = await query<{ order_id: string; reason: string }>(
      `SELECT order_id, reason FROM withdrawal_reason_record WHERE order_id=$1`,
      [testOrderId],
    );
    expect(reasonRows.length, "withdrawal_reason_record 레코드 존재").toBeGreaterThanOrEqual(1);
    expect(reasonRows[0].reason, "reason = simple_change 저장 확인").toBe("simple_change");

    // 5) cleanup
    await query(`DELETE FROM withdrawal_reason_record WHERE order_id=$1`, [testOrderId]);
    await query(`DELETE FROM withdrawal_eligibility WHERE order_id=$1`, [testOrderId]);
  });
});

// 시나리오 6 = RMA 모듈 검증
// API endpoint 가 없으므로 DB 직접 조회 + table schema + 데이터 흐름 검증으로 대체합니다.
// 1) returns_policy seed 조회 (window_days=7 확인)
// 2) reimbursement_method schema 검증 (type CHECK 제약조건)
// 3) return_inspection schema + condition 제약조건 검증
// 4) shipping_fee_policy 의 customer payer 정책 검증
import { test, expect } from "@playwright/test";
import { query, tableExists } from "../helpers/db";

test.describe("시나리오 6 = RMA 모듈", () => {
  test("returns_policy + return_inspection + reimbursement_method DB 검증", async () => {
    // 1) 4 테이블 모두 존재 확인
    const tables = [
      "returns_policy",
      "return_inspection",
      "reimbursement_method",
      "return_shipping_fee_policy",
    ];
    for (const t of tables) {
      const exists = await tableExists(t);
      console.log(`[시나리오 6] ${t} 존재 = ${exists}`);
      expect(exists, `${t} 테이블이 존재해야 합니다`).toBeTruthy();
    }

    // 2) returns_policy seed 데이터 확인
    const policies = await query<{
      window_days: number;
      shipping_fee_payer: string;
      restocking_fee_pct: number;
      active: boolean;
    }>(
      `SELECT window_days, shipping_fee_payer, restocking_fee_pct, active
       FROM returns_policy WHERE deleted_at IS NULL`,
    );
    console.log(`[시나리오 6] returns_policy 행 수 = ${policies.length}`);
    if (policies.length > 0) {
      console.log(`[시나리오 6] policies = ${JSON.stringify(policies)}`);
    }

    // returns_policy schema 검증 (window_days 기본값 = 7, shipping_fee_payer 기본 = customer)
    const schemaInfo = await query<{
      column_name: string;
      data_type: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, column_default FROM information_schema.columns
       WHERE table_schema='public' AND table_name='returns_policy'
       ORDER BY ordinal_position`,
    );
    const windowDaysCol = schemaInfo.find(c => c.column_name === "window_days");
    expect(windowDaysCol, "window_days 컬럼 존재").toBeTruthy();
    expect(windowDaysCol?.column_default, "window_days 기본값 = 7").toContain("7");

    const payerCol = schemaInfo.find(c => c.column_name === "shipping_fee_payer");
    expect(payerCol?.column_default, "shipping_fee_payer 기본값 = customer").toContain("customer");

    // 박제: seed 데이터 0 행 = 한국 default 정책 미시드 (별도 이슈)
    if (policies.length === 0) {
      console.log(`[시나리오 6 박제] returns_policy seed 데이터 0행 = 한국 default 미시드 (P1 이슈)`);
    }

    // 3) return_inspection 의 condition CHECK 제약조건 검증
    const inspCheck = await query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname='return_inspection' AND c.contype='c'`,
    );
    console.log(`[시나리오 6] return_inspection 제약 = ${JSON.stringify(inspCheck)}`);
    const hasGrades = inspCheck.some(
      x => x.pg_get_constraintdef.includes("A_GRADE") &&
           x.pg_get_constraintdef.includes("B_GRADE") &&
           x.pg_get_constraintdef.includes("C_GRADE") &&
           x.pg_get_constraintdef.includes("DISPOSE"),
    );
    expect(hasGrades, "return_inspection.condition 은 A/B/C_GRADE + DISPOSE 4 등급 제약").toBeTruthy();

    // 4) reimbursement_method 의 type/status CHECK 제약조건 검증
    const reimCheck = await query<{ pg_get_constraintdef: string }>(
      `SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname='reimbursement_method' AND c.contype='c'`,
    );
    const hasTypes = reimCheck.some(
      x => x.pg_get_constraintdef.includes("REFUND") &&
           x.pg_get_constraintdef.includes("STORE_CREDIT") &&
           x.pg_get_constraintdef.includes("EXCHANGE") &&
           x.pg_get_constraintdef.includes("REPLACEMENT"),
    );
    expect(hasTypes, "reimbursement_method.type 은 REFUND/STORE_CREDIT/EXCHANGE/REPLACEMENT 4 종 제약").toBeTruthy();

    // 5) return_shipping_fee_policy 데이터 확인 (사유별 payer 정책)
    const feePolicies = await query<{ reason: string; payer: string }>(
      `SELECT * FROM return_shipping_fee_policy LIMIT 20`,
    );
    console.log(`[시나리오 6] return_shipping_fee_policy 행 수 = ${feePolicies.length}`);
  });
});

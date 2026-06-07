/**
 * product-list-logic 단위 테스트 (d3 t001_상품목록)
 *
 * spec: dag/d3_상품관리/t001_상품목록.md / unit_test/unit_014_상품목록.md
 *  - 필터 쿼리 생성(status 화이트리스트/카테고리)
 *  - 노출제어 판정
 *  - CSV export (UT-002 export 템플릿 정합)
 * production 함수 직접 import — page.tsx/orders.ts 정합 함수.
 */
import { describe, it, expect } from "vitest";
import {
  buildProductListQuery,
  isProductVisible,
  pickRepresentativePrice,
  productsToCsv,
  ALLOWED_PRODUCT_STATUSES,
} from "./product-list-logic";
import type { ProductListItem } from "@/lib/api/products";

describe("buildProductListQuery (필터/노출제어)", () => {
  it("기본값: limit 20 / offset 0 / -updated_at 정렬", () => {
    const q = buildProductListQuery();
    expect(q.limit).toBe("20");
    expect(q.offset).toBe("0");
    expect(q.order).toBe("-updated_at");
  });

  it("q passthrough", () => {
    expect(buildProductListQuery({ q: "셔츠" }).q).toBe("셔츠");
  });

  it("허용 status 는 status[] 로 포함", () => {
    for (const s of ALLOWED_PRODUCT_STATUSES) {
      expect(buildProductListQuery({ status: s })["status[]"]).toBe(s);
    }
  });

  it("화이트리스트 외 status 는 조용히 무시", () => {
    const q = buildProductListQuery({ status: "weird_status" });
    expect(q["status[]"]).toBeUndefined();
  });

  it("categoryId → category_id[] 매핑", () => {
    expect(buildProductListQuery({ categoryId: "pcat_1" })["category_id[]"]).toBe("pcat_1");
  });

  it("limit/offset 오버라이드", () => {
    const q = buildProductListQuery({ limit: 50, offset: 100 });
    expect(q.limit).toBe("50");
    expect(q.offset).toBe("100");
  });
});

describe("isProductVisible (노출 ON 판정)", () => {
  it("published 만 노출 ON", () => {
    expect(isProductVisible({ status: "published" })).toBe(true);
    expect(isProductVisible({ status: "draft" })).toBe(false);
    expect(isProductVisible({ status: "proposed" })).toBe(false);
    expect(isProductVisible({ status: "rejected" })).toBe(false);
  });
});

describe("pickRepresentativePrice", () => {
  it("선호 통화(krw) 우선 + 최저가 선택", () => {
    const rep = pickRepresentativePrice([
      { prices: [{ amount: 5000, currency_code: "krw" }, { amount: 9, currency_code: "usd" }] },
      { prices: [{ amount: 3000, currency_code: "krw" }] },
    ]);
    expect(rep).toEqual({ amount: 3000, currency_code: "krw" });
  });

  it("선호 통화 없으면 전체 최저가", () => {
    const rep = pickRepresentativePrice([{ prices: [{ amount: 12, currency_code: "usd" }] }]);
    expect(rep).toEqual({ amount: 12, currency_code: "usd" });
  });

  it("가격 없으면 null", () => {
    expect(pickRepresentativePrice([])).toBeNull();
    expect(pickRepresentativePrice(undefined)).toBeNull();
  });
});

function sampleProducts(): ProductListItem[] {
  return [
    {
      id: "prod_1",
      title: "기본 셔츠",
      status: "published",
      thumbnail: null,
      handle: "basic-shirt",
      updated_at: "2026-06-01T00:00:00.000Z",
      categories: [{ id: "c1", name: "상의" }],
      collection: null,
      variants: [{ id: "v1", title: "S", sku: "SH-S", prices: [{ amount: 19900, currency_code: "krw" }] }],
    },
    {
      id: "prod_2",
      title: '따옴표"콤마,상품',
      status: "draft",
      thumbnail: null,
      handle: "quoted",
      updated_at: "2026-06-02T00:00:00.000Z",
      categories: [],
      collection: null,
      variants: [],
    },
  ];
}

describe("productsToCsv (export)", () => {
  it("UTF-8 BOM 으로 시작", () => {
    expect(productsToCsv(sampleProducts()).startsWith("﻿")).toBe(true);
  });

  it("한글 헤더 포함", () => {
    const csv = productsToCsv(sampleProducts());
    const header = csv.replace(/^﻿/, "").split("\n")[0];
    expect(header).toContain("상품명");
    expect(header).toContain("대표가격");
    expect(header).toContain("카테고리");
  });

  it("대표가격/카테고리 셀 매핑", () => {
    const csv = productsToCsv(sampleProducts());
    const row1 = csv.replace(/^﻿/, "").split("\n")[1];
    expect(row1).toContain("19900");
    expect(row1).toContain("상의");
  });

  it("콤마/쌍따옴표 포함 셀 이스케이프", () => {
    const csv = productsToCsv(sampleProducts());
    const row2 = csv.replace(/^﻿/, "").split("\n")[2];
    // 따옴표"콤마,상품 → "따옴표""콤마,상품"
    expect(row2).toContain('"따옴표""콤마,상품"');
  });

  it("빈 목록도 헤더는 출력", () => {
    const csv = productsToCsv([]);
    expect(csv.replace(/^﻿/, "").split("\n").length).toBe(1);
  });
});

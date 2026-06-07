/**
 * consent-logic 단위 테스트 (d5 t008_동의이력)
 * spec: dag/d5_회원관리/t008_동의이력.md §9 — 최신동의/2년 재확인
 */
import { describe, it, expect } from "vitest";
import {
  getLatestConsent,
  isConsented,
  isReconsentDue,
  channelsNeedingReconsent,
  type ConsentRecord,
} from "./consent-logic";

const RECORDS: ConsentRecord[] = [
  { channel: "marketing", agreed: true, recordedAt: "2023-01-01T00:00:00.000Z" },
  { channel: "marketing", agreed: false, recordedAt: "2023-06-01T00:00:00.000Z" },
  { channel: "marketing", agreed: true, recordedAt: "2024-01-01T00:00:00.000Z" },
  { channel: "terms", agreed: true, recordedAt: "2026-01-01T00:00:00.000Z" },
];

describe("getLatestConsent / isConsented", () => {
  it("최신 기록 반환", () => {
    const latest = getLatestConsent(RECORDS, "marketing");
    expect(latest?.recordedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(latest?.agreed).toBe(true);
  });
  it("기록 없는 채널 null", () => {
    expect(getLatestConsent(RECORDS, "sms")).toBeNull();
  });
  it("현재 동의 상태", () => {
    expect(isConsented(RECORDS, "marketing")).toBe(true);
    expect(isConsented(RECORDS, "sms")).toBe(false);
  });
});

describe("isReconsentDue (2년)", () => {
  it("2년 경과면 재확인 필요", () => {
    // 2024-01-01 + 2년 = 2026-01-01, now 2026-06-04 → due
    expect(isReconsentDue("2024-01-01T00:00:00.000Z", "2026-06-04T00:00:00.000Z")).toBe(true);
  });
  it("2년 미만이면 불필요", () => {
    expect(isReconsentDue("2025-06-01T00:00:00.000Z", "2026-06-04T00:00:00.000Z")).toBe(false);
  });
  it("정확히 2년이면 도래", () => {
    expect(isReconsentDue("2024-06-04T00:00:00.000Z", "2026-06-04T00:00:00.000Z")).toBe(true);
  });
});

describe("channelsNeedingReconsent", () => {
  it("동의 중 2년 경과 채널만 추출", () => {
    const due = channelsNeedingReconsent(RECORDS, ["marketing", "terms"], "2026-06-04T00:00:00.000Z");
    // marketing: 최신 2024-01-01 동의 → 2년 경과 → 포함
    // terms: 2026-01-01 동의 → 경과 안 함 → 제외
    expect(due).toContain("marketing");
    expect(due).not.toContain("terms");
  });
  it("미동의 채널은 제외", () => {
    const records: ConsentRecord[] = [
      { channel: "marketing", agreed: false, recordedAt: "2020-01-01T00:00:00.000Z" },
    ];
    expect(channelsNeedingReconsent(records, ["marketing"], "2026-06-04T00:00:00.000Z")).toEqual([]);
  });
});

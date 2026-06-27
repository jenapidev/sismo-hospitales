import { describe, it, expect } from "vitest";
import { toUsd, totalsToUsd, usdView } from "@/lib/rates";

const rates = { bsPerUsd: 600, bsPerEur: 660 };

describe("toUsd", () => {
  it("passes USD through", () => {
    expect(toUsd(100, "USD", rates)).toBe(100);
  });
  it("converts Bs by the USD rate", () => {
    expect(toUsd(600, "Bs", rates)).toBe(1);
  });
  it("converts EUR via the Bs cross rate", () => {
    expect(toUsd(10, "EUR", rates)).toBeCloseTo(11, 5); // 10 * 660 / 600
  });
});

describe("totalsToUsd", () => {
  it("sums all currencies into USD", () => {
    expect(totalsToUsd({ Bs: 600, USD: 100, EUR: 10 }, rates)).toBeCloseTo(112, 5);
  });
});

describe("usdView", () => {
  it("converts goal + totals to USD when rates exist", () => {
    const v = usdView(1500, "USD", { Bs: 1500, USD: 210, EUR: 0 }, rates);
    expect(v.goalUsd).toBe(1500);
    expect(v.totalUsd).toBeCloseTo(212.5, 5); // 210 + 1500/600
  });
  it("falls back to USD-only when rates are missing", () => {
    const v = usdView(1500, "USD", { Bs: 1500, USD: 210, EUR: 0 }, null);
    expect(v.goalUsd).toBe(1500);
    expect(v.totalUsd).toBe(210);
  });
  it("returns nulls for a non-USD colecta without rates", () => {
    const v = usdView(1000, "Bs", { Bs: 1000, USD: 0, EUR: 0 }, null);
    expect(v.goalUsd).toBeNull();
    expect(v.totalUsd).toBeNull();
  });
});

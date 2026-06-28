import { describe, it, expect } from "vitest";
import { colectaTotals, type DonacionRow } from "@/lib/colectas-data";

function d(over: Partial<DonacionRow>): DonacionRow {
  return {
    id: "x",
    colecta_id: "c",
    account_id: null,
    amount: 0,
    currency: "USD",
    donor_name: null,
    status: "pending",
    created_at: "",
    ...over,
  };
}

describe("colectaTotals — counts everything except rejected", () => {
  it("includes pending donations in the total", () => {
    const totals = colectaTotals([
      d({ amount: 100, currency: "USD", status: "confirmed" }),
      d({ amount: 50, currency: "USD", status: "pending" }),
    ]);
    expect(totals.USD).toBe(150);
  });

  it("subtracts (excludes) rejected donations", () => {
    const totals = colectaTotals([
      d({ amount: 100, currency: "USD", status: "confirmed" }),
      d({ amount: 999, currency: "USD", status: "rejected" }),
    ]);
    expect(totals.USD).toBe(100);
  });

  it("sums pending across currencies", () => {
    const totals = colectaTotals([
      d({ amount: 1000, currency: "Bs", status: "pending" }),
      d({ amount: 20, currency: "EUR", status: "confirmed" }),
      d({ amount: 5, currency: "USD", status: "rejected" }),
    ]);
    expect(totals).toEqual({ Bs: 1000, USD: 0, EUR: 20 });
  });
});

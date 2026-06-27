import type { CurrencyTotals } from "@/lib/colectas-data";

export interface BcvRates {
  bsPerUsd: number;
  bsPerEur: number;
}

/**
 * Official BCV rates (Bs per USD / per EUR) from the free ve.dolarapi.com.
 * Cached for 1 hour via Next's fetch cache. Returns null if unavailable.
 */
export async function getBcvRates(): Promise<BcvRates | null> {
  try {
    const [u, e] = await Promise.all([
      fetch("https://ve.dolarapi.com/v1/dolares/oficial", { next: { revalidate: 3600 } }),
      fetch("https://ve.dolarapi.com/v1/euros/oficial", { next: { revalidate: 3600 } }),
    ]);
    const uj = await u.json();
    const ej = await e.json();
    const bsPerUsd = Number(uj?.promedio);
    const bsPerEur = Number(ej?.promedio);
    if (!Number.isFinite(bsPerUsd) || bsPerUsd <= 0) return null;
    return { bsPerUsd, bsPerEur: Number.isFinite(bsPerEur) && bsPerEur > 0 ? bsPerEur : 0 };
  } catch {
    return null;
  }
}

/** Convert an amount in a given currency to USD using BCV rates. */
export function toUsd(amount: number, currency: string, rates: BcvRates): number {
  if (currency === "USD") return amount;
  if (currency === "EUR") {
    return rates.bsPerEur && rates.bsPerUsd ? (amount * rates.bsPerEur) / rates.bsPerUsd : 0;
  }
  return rates.bsPerUsd ? amount / rates.bsPerUsd : 0; // Bs
}

export function totalsToUsd(totals: CurrencyTotals, rates: BcvRates): number {
  return totals.USD + toUsd(totals.Bs, "Bs", rates) + toUsd(totals.EUR, "EUR", rates);
}

/** Goal + total expressed in USD for the progress bar, or nulls if no rates. */
export function usdView(
  goal: number | null,
  currency: string,
  totals: CurrencyTotals,
  rates: BcvRates | null
): { goalUsd: number | null; totalUsd: number | null } {
  if (!rates) {
    // No rates: only a pure-USD colecta can show a meaningful bar.
    return { goalUsd: currency === "USD" ? goal : null, totalUsd: currency === "USD" ? totals.USD : null };
  }
  return {
    goalUsd: goal != null ? toUsd(goal, currency, rates) : null,
    totalUsd: totalsToUsd(totals, rates),
  };
}

import { money } from "@/lib/colectas-format";
import type { CurrencyTotals } from "@/lib/colectas-data";

/**
 * Progress bar always in USD (totals converted via BCV). A breakdown line shows
 * the amounts actually received in each currency. If USD figures aren't available
 * (rates down + non-USD colecta), it falls back to the per-currency breakdown.
 */
export function Progress({
  goalUsd,
  totalUsd,
  received,
}: {
  goalUsd: number | null;
  totalUsd: number | null;
  received: CurrencyTotals;
}) {
  const parts: string[] = [];
  if (received.Bs > 0) parts.push(money(received.Bs, "Bs"));
  if (received.USD > 0) parts.push(money(received.USD, "USD"));
  if (received.EUR > 0) parts.push(money(received.EUR, "EUR"));
  const breakdown =
    parts.length > 0 ? (
      <p className="mt-1 text-xs text-gray-500">Recibido: {parts.join(" · ")}</p>
    ) : null;

  if (totalUsd == null) {
    return (
      <div>
        <p className="text-sm text-gray-700">
          Recaudado (confirmado): <strong>{parts.length ? parts.join(" · ") : money(0, "USD")}</strong>
        </p>
      </div>
    );
  }

  if (goalUsd && goalUsd > 0) {
    const pct = Math.min(100, Math.round((totalUsd / goalUsd) * 100));
    return (
      <div>
        <div className="flex justify-between text-sm text-gray-700">
          <span>
            <strong>{money(totalUsd, "USD")}</strong> de {money(goalUsd, "USD")}
          </span>
          <span className="text-gray-500">{pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
        </div>
        {breakdown}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-700">
        Recaudado (confirmado): <strong>{money(totalUsd, "USD")}</strong>
      </p>
      {breakdown}
    </div>
  );
}

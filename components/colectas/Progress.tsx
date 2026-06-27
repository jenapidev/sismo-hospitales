import { money } from "@/lib/colectas-format";
import type { CurrencyTotals } from "@/lib/colectas-data";

export function Progress({
  goal,
  totals,
  currency,
}: {
  goal: number | null;
  totals: CurrencyTotals;
  currency: string;
}) {
  const main = currency === "USD" ? totals.USD : totals.Bs;
  const otherCur = currency === "USD" ? "Bs" : "USD";
  const other = currency === "USD" ? totals.Bs : totals.USD;
  const pct = goal && goal > 0 ? Math.min(100, Math.round((main / goal) * 100)) : 0;

  return (
    <div>
      {goal && goal > 0 ? (
        <>
          <div className="flex justify-between text-sm text-gray-700">
            <span>
              <strong>{money(main, currency)}</strong> de {money(goal, currency)}
            </span>
            <span className="text-gray-500">{pct}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-700">
          Recaudado (confirmado): <strong>{money(main, currency)}</strong>
        </p>
      )}
      {other > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          También se recibió <strong>{money(other, otherCur)}</strong> en {otherCur}.
        </p>
      )}
    </div>
  );
}

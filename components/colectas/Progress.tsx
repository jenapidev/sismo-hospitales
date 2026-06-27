import { money } from "@/lib/colectas-format";

export function Progress({
  goal,
  total,
  currency,
}: {
  goal: number | null;
  total: number;
  currency: string;
}) {
  if (!goal || goal <= 0) {
    return (
      <p className="text-sm text-gray-700">
        Recaudado (confirmado): <strong>{money(total, currency)}</strong>
      </p>
    );
  }
  const pct = Math.min(100, Math.round((total / goal) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm text-gray-700">
        <span>
          <strong>{money(total, currency)}</strong> de {money(goal, currency)}
        </span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

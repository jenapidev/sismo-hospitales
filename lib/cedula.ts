/**
 * Venezuelan cédula utilities.
 *
 * A cédula is a nationality letter (V/E/J/P/G) followed by 6–9 digits.
 * We store a normalized form (e.g. "V12345678") for matching/dedup, and never
 * show the full number in public listings — only a masked form.
 */

const NATIONALITY = new Set(["V", "E", "J", "P", "G"]);

/**
 * Normalize a raw cédula string to "<LETTER><digits>" or return null if it
 * cannot be parsed. Missing nationality letter defaults to "V".
 */
export function normalizeCedula(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = cleaned.match(/^([A-Z]?)(\d{6,9})$/);
  if (!m) return null;
  const letter = m[1] && NATIONALITY.has(m[1]) ? m[1] : "V";
  return `${letter}${m[2]}`;
}

/**
 * Mask a normalized cédula for public display.
 *
 * Format: keep the nationality letter and the first four digits (grouped
 * "NN.NN"), then replace every remaining digit with "X" — the fifth digit
 * attaches directly to the group ("34X"), and any further digits are shown
 * in dot-separated groups of three.
 *
 *   "V12345678" -> "V-12.34X.XXX"
 *   "E1234567"  -> "E-12.34X.XX"
 *
 * Returns the input unchanged if it is not a normalized cédula.
 */
export function maskCedula(normalized: string): string {
  const m = normalized.match(/^([A-Z])(\d+)$/);
  if (!m) return normalized;
  const [, letter, digits] = m;
  const first2 = digits.slice(0, 2);
  const next2 = digits.slice(2, 4);
  const masked = "X".repeat(Math.max(0, digits.length - 4));

  let out = `${letter}-${first2}`;
  if (next2) out += `.${next2}`;
  if (masked.length > 0) {
    out += masked[0]; // the fifth digit, attached: "34X"
    const remaining = masked.slice(1);
    if (remaining.length > 0) {
      out += `.${remaining.match(/.{1,3}/g)!.join(".")}`;
    }
  }
  return out;
}

/**
 * Hospital-name detection. The Drive files embed the hospital name mid-row, with
 * inconsistent spelling/accents (e.g. "Hopital", "Pérez"/"Perez", "Arvelo"/"Arveledo").
 * We match on accent-folded, lower-cased distinctive fragments.
 *
 * Accent folding replaces each accented char with its ASCII base (same length), so
 * match indices computed on the folded string are valid on the original string too.
 */

export interface HospitalMatch {
  slug: string;
  name: string; // the matched substring from the original text
  start: number;
  end: number;
}

/** A url-safe slug from an arbitrary place name (for auto-created places). */
export function slugify(name: string): string {
  const s = foldAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "sin-lugar";
}

export function foldAccents(s: string): string {
  return s
    .replace(/[áàäâã]/gi, (c) => (c === c.toUpperCase() ? "A" : "a"))
    .replace(/[éèëê]/gi, (c) => (c === c.toUpperCase() ? "E" : "e"))
    .replace(/[íìïî]/gi, (c) => (c === c.toUpperCase() ? "I" : "i"))
    .replace(/[óòöôõ]/gi, (c) => (c === c.toUpperCase() ? "O" : "o"))
    .replace(/[úùüû]/gi, (c) => (c === c.toUpperCase() ? "U" : "u"))
    .replace(/[ñ]/gi, (c) => (c === c.toUpperCase() ? "N" : "n"));
}

// Canonical display names per slug — used to auto-create hospitals seen in the data
// but not in the seed (e.g. Ricardo Baquero González).
export const SLUG_NAMES: Record<string, string> = {
  "universitario-caracas": "Hospital Universitario de Caracas",
  luciani: "Hospital Domingo Luciani",
  "perez-carreno": "Hospital Pérez Carreño",
  "vargas-caracas": "Hospital Vargas de Caracas",
  "carlos-arvelo": "Hospital Carlos Arvelo",
  "ricardo-baquero": "Hospital Ricardo Baquero González",
  catia: "Hospital de Catia",
};

// Distinctive fragments (folded, lowercase) → canonical slug. Order doesn't matter;
// when several match, the earliest position in the row wins.
const PATTERNS: { re: RegExp; slug: string }[] = [
  { re: /universitario de caracas/i, slug: "universitario-caracas" },
  { re: /domingo luciani|luciani/i, slug: "luciani" },
  { re: /perez carreno/i, slug: "perez-carreno" },
  { re: /vargas de caracas|vargas/i, slug: "vargas-caracas" },
  { re: /carlos arvel/i, slug: "carlos-arvelo" }, // arvelo / arveledo
  { re: /ricardo baquero/i, slug: "ricardo-baquero" },
  { re: /de catia|catia/i, slug: "catia" },
];

// Extend a match backwards to absorb a preceding "Hospital "/"Hopital "/"Clinica [de] "
// so the returned span (and therefore the row split) excludes the hospital word too.
const PREFIX_RE = /(hos?pital|hopital|cl[ií]nica)(\s+de)?\s*$/i;

/**
 * Find the hospital referenced in `text`, or null. Returns the earliest match,
 * with its span widened to include a leading hospital/clinic word when present.
 */
export function detectHospital(text: string): HospitalMatch | null {
  const folded = foldAccents(text);
  let best: HospitalMatch | null = null;
  for (const { re, slug } of PATTERNS) {
    const m = re.exec(folded);
    if (!m) continue;
    let start = m.index;
    const end = m.index + m[0].length;
    const prefix = PREFIX_RE.exec(folded.slice(0, start));
    if (prefix) start = prefix.index;
    if (best === null || start < best.start) {
      best = { slug, name: text.slice(start, end), start, end };
    }
  }
  return best;
}

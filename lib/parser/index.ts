import { normalizeCedula } from "@/lib/cedula";
import type { Status } from "@/lib/types";
import type { ParsedRecord } from "./types";
import { detectHospital } from "./hospitals";

export type { ParsedRecord } from "./types";
export { detectHospital } from "./hospitals";

// Lines that are headers / titles / instructions, not people.
const NOISE_RE =
  /registro maestro|para buscar|apellidos y nombres|numapellidos|fecha de actualiz|ingresos? x sismo|^\s*n[°º]\s*$/i;

/** Parse a plain-text Drive document into person records. */
export function parseDocument(text: string, sourceFile: string): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line || NOISE_RE.test(line)) return;

    const hospital = detectHospital(line);
    if (!hospital) return; // no hospital anchor → not a usable person row

    const pre = line.slice(0, hospital.start);
    const post = line.slice(hospital.end);

    // Strip the leading row number (N°) from `pre`.
    const numMatch = pre.match(/^\s*\d+\s*/);
    const preBody = (numMatch ? pre.slice(numMatch[0].length) : pre).trim();

    let fullName = "";
    let cedula: string | null = null;
    let age: number | null = null;
    let sex: string | null = null;
    let blobConf = 1;

    if (preBody.length === 0) {
      // MASTER format: <num><HOSPITAL><NAME><age?>  → name + age are in `post`.
      const after = post.trim();
      const ageM = after.match(/(\d{1,3})\s*$/);
      age = ageM ? parseInt(ageM[1], 10) : null;
      fullName = after.replace(/\d{1,3}\s*$/, "").trim();
    } else {
      // CONSOLIDADO format: <num><NAME><CI?><age?><sex?><proc?><HOSPITAL>...
      const nameM = preBody.match(/^[^\d]+/);
      fullName = (nameM ? nameM[0] : preBody).trim();
      let rest = preBody.slice(nameM ? nameM[0].length : 0);

      const blobM = rest.match(/^\d+/);
      const blob = blobM ? blobM[0] : "";
      rest = rest.slice(blob.length);

      const interp = interpretBlob(blob);
      cedula = interp.cedula;
      age = interp.age;
      blobConf = interp.conf;

      // Optional single sex letter, only when followed by an uppercase letter
      // (start of procedencia) or end — avoids eating a capitalized place name.
      const sexM = rest.match(/^([MFmf])(?=[A-ZÁÉÍÓÚÑ]|$)/);
      if (sexM) sex = sexM[1];
    }

    const admissionDate = parseDate(post);
    const status = detectStatus(line);

    let confidence = blobConf;
    if (!fullName) confidence = Math.min(confidence, 0.2);
    if (fullName && fullName.split(/\s+/).length < 2) confidence -= 0.2;
    confidence = Math.max(0, Math.min(1, confidence));

    out.push({
      fullName,
      cedula,
      hospitalName: hospital.name.trim(),
      hospitalSlug: hospital.slug,
      status,
      admissionDate,
      age,
      sex,
      notes: null,
      rowRef: `${sourceFile}#${i}`,
      confidence,
    });
  });

  return out;
}

/**
 * Interpret the digit blob that follows the name in consolidado rows. CI (cédula)
 * and Edad (age) are concatenated with no separator, so the boundary is a heuristic.
 */
function interpretBlob(blob: string): {
  cedula: string | null;
  age: number | null;
  conf: number;
} {
  const len = blob.length;
  if (len === 0) return { cedula: null, age: null, conf: 1 };
  if (len <= 3) return { cedula: null, age: parseInt(blob, 10), conf: 1 };
  if (len >= 6 && len <= 8) return { cedula: normalizeCedula(blob), age: null, conf: 1 };
  if (len >= 9 && len <= 11) {
    const ced = normalizeCedula(blob.slice(0, len - 2));
    const age = parseInt(blob.slice(len - 2), 10);
    return { cedula: ced, age, conf: 0.7 };
  }
  // len 4–5, or >11: genuinely ambiguous.
  const n = parseInt(blob, 10);
  return {
    cedula: len >= 6 ? normalizeCedula(blob) : null,
    age: n <= 110 ? n : null,
    conf: 0.5,
  };
}

/** These lists are admissions; default to admitted unless a row says otherwise. */
function detectStatus(line: string): Status {
  const l = foldLower(line);
  if (/fallecid|muert|deceso/.test(l)) return "deceased";
  if (/egresad|de alta|alta medica/.test(l)) return "discharged";
  if (/traslad/.test(l)) return "transferred";
  return "admitted";
}

function foldLower(s: string): string {
  return s.toLowerCase();
}

/** Pull a dd/mm/yy(yy) date out of text → ISO yyyy-mm-dd, or null. */
function parseDate(text: string): string | null {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = m[2].padStart(2, "0");
  let year = m[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

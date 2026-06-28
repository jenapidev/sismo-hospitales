import { normalizeCedula } from "@/lib/cedula";
import type { Status } from "@/lib/types";
import type { ParsedRecord } from "./types";
import { detectHospital, slugify, foldAccents, SLUG_NAMES } from "./hospitals";

function fold(s: string): string {
  return foldAccents(s ?? "").toLowerCase().trim();
}

interface ColMap {
  apellido: number;
  nombre: number;
  nombreCompleto: number;
  cedula: number;
  edad: number;
  sexo: number;
  hospital: number;
  estado: number;
  fecha: number;
  notes: number[];
}

function matchHeader(cells: string[]): ColMap {
  const map: ColMap = {
    apellido: -1, nombre: -1, nombreCompleto: -1, cedula: -1, edad: -1,
    sexo: -1, hospital: -1, estado: -1, fecha: -1, notes: [],
  };
  cells.forEach((raw, i) => {
    const h = fold(raw);
    if (!h) return;
    if (map.nombreCompleto < 0 && (h.includes("apellidos y nombres") || h.includes("nombre y apellido") || h === "paciente" || h.includes("nombre completo")))
      map.nombreCompleto = i;
    else if (map.apellido < 0 && h.includes("apellido")) map.apellido = i;
    else if (map.nombre < 0 && h.includes("nombre")) map.nombre = i;
    if (map.cedula < 0 && (h.includes("cedula") || h === "ci" || h === "c.i" || h === "c.i." || h.includes("/id") || h === "id" || h.includes("documento")))
      map.cedula = i;
    if (map.edad < 0 && h.includes("edad")) map.edad = i;
    if (map.sexo < 0 && h.includes("sexo")) map.sexo = i;
    if (map.hospital < 0 && (h.includes("hospital") || h.includes("centro"))) map.hospital = i;
    if (map.estado < 0 && (h.includes("estado") || h.includes("condicion"))) map.estado = i;
    if (map.fecha < 0 && h.includes("fecha")) map.fecha = i;
    if (/comentario|diagnostico|servicio|info|observa|procedencia|\barea\b|zona/.test(h)) map.notes.push(i);
  });
  return map;
}

/** How many person-defining headers a row matches — used to locate the header row. */
function headerScore(map: ColMap): number {
  let n = 0;
  for (const k of ["apellido", "nombre", "nombreCompleto", "cedula", "edad", "sexo", "hospital"] as const) {
    if (map[k] >= 0) n++;
  }
  return n;
}

function statusFrom(text: string): Status {
  const l = fold(text);
  if (/fallecid|muert|deceso/.test(l)) return "deceased";
  if (/egresad|de alta|alta medica/.test(l)) return "discharged";
  if (/traslad/.test(l)) return "transferred";
  return "admitted";
}

function parseDate(text: string): string | null {
  const m = (text ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Parse a spreadsheet (Google Sheet CSV rows, or .xlsx rows) into person records.
 * Tolerant: finds the header row, maps columns fuzzily, one person per row.
 * Place comes from a hospital/centro column, else from `fallbackPlace`
 * (the sheet/file/folder name).
 */
export function parseTabular(
  rows: string[][],
  sourceFile: string,
  fallbackPlace?: string
): ParsedRecord[] {
  // Locate the header row (scan the first 15 rows; need >=2 person headers).
  let headerIdx = -1;
  let cols: ColMap | null = null;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const m = matchHeader(rows[i] ?? []);
    if (headerScore(m) >= 2) {
      headerIdx = i;
      cols = m;
      break;
    }
  }
  if (headerIdx < 0 || !cols) return [];

  const out: ParsedRecord[] = [];
  const cell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];

    let fullName: string;
    if (cols.nombreCompleto >= 0) fullName = cell(row, cols.nombreCompleto);
    else fullName = [cell(row, cols.apellido), cell(row, cols.nombre)].filter(Boolean).join(" ");
    fullName = fullName.trim();
    if (!fullName) continue;

    const cedula = cols.cedula >= 0 ? normalizeCedula(cell(row, cols.cedula)) : null;

    let age: number | null = null;
    const ageRaw = cell(row, cols.edad);
    if (ageRaw) {
      const n = parseInt(ageRaw, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 130) age = n;
    }

    let sex: string | null = null;
    const sexRaw = cell(row, cols.sexo);
    if (sexRaw && /^[mf]/i.test(sexRaw)) sex = sexRaw[0].toUpperCase();

    const rawPlace = cell(row, cols.hospital) || (fallbackPlace ?? "");
    let hospitalName: string | null = null;
    let hospitalSlug: string | null = null;
    if (rawPlace) {
      const det = detectHospital(rawPlace);
      if (det) {
        hospitalSlug = det.slug;
        hospitalName = SLUG_NAMES[det.slug] ?? rawPlace;
      } else {
        hospitalSlug = slugify(rawPlace);
        hospitalName = rawPlace;
      }
    }

    const estado = cell(row, cols.estado);
    const noteParts = cols.notes.map((idx) => cell(row, idx)).filter(Boolean);
    const notes = noteParts.length ? noteParts.join(" · ") : null;

    out.push({
      fullName,
      cedula,
      hospitalName,
      hospitalSlug,
      status: statusFrom(`${estado} ${notes ?? ""}`),
      admissionDate: parseDate(cell(row, cols.fecha)),
      age,
      sex,
      notes,
      rowRef: `${sourceFile}#${i}`,
      confidence: 1,
    });
  }

  return out;
}

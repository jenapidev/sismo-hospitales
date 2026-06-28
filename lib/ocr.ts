import { normalizeCedula } from "@/lib/cedula";
import type { Status } from "@/lib/types";
import type { ParsedRecord } from "@/lib/parser";
import { detectHospital, slugify, foldAccents, SLUG_NAMES } from "@/lib/parser/hospitals";

const OCR_CONFIDENCE = 0.4; // always below the 0.6 review threshold

function statusFrom(text: string): Status {
  const l = foldAccents(String(text ?? "")).toLowerCase();
  if (/fallecid|muert|deceso/.test(l)) return "deceased";
  if (/egresad|de alta|alta medica/.test(l)) return "discharged";
  if (/traslad/.test(l)) return "transferred";
  return "admitted";
}

function resolvePlace(place: string): { slug: string | null; name: string | null } {
  const raw = (place ?? "").trim();
  if (!raw) return { slug: null, name: null };
  const det = detectHospital(raw);
  if (det) return { slug: det.slug, name: SLUG_NAMES[det.slug] ?? raw };
  return { slug: slugify(raw), name: raw };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function nameOf(item: any): string {
  const direct = item.nombre ?? item.apellidos_nombres ?? item.apellidosYNombres ?? item.name ?? item.nombre_completo;
  if (direct) return String(direct).trim();
  const parts = [item.apellidos ?? item.apellido, item.nombres ?? item.nombre].filter(Boolean);
  return parts.join(" ").trim();
}

/** Map the model's JSON output to records. Pure; tolerant of fences/garbage. */
export function parseOcrJson(text: string, imageId: string, place: string): ParsedRecord[] {
  let raw = (text ?? "").trim();
  // strip ```json ... ``` fences if present
  raw = raw.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const arr: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.personas)
      ? (parsed as any).personas
      : [];

  const { slug, name } = resolvePlace(place);
  const out: ParsedRecord[] = [];
  arr.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const fullName = nameOf(item);
    if (!fullName) return;
    const cedula = item.cedula || item.ci ? normalizeCedula(String(item.cedula ?? item.ci)) : null;
    let age: number | null = null;
    const n = Number(item.edad);
    if (Number.isFinite(n) && n >= 0 && n <= 130) age = n;
    const sexRaw = String(item.sexo ?? "");
    const sex = /^[mf]/i.test(sexRaw) ? sexRaw[0].toUpperCase() : null;
    out.push({
      fullName,
      cedula,
      hospitalName: name,
      hospitalSlug: slug,
      status: statusFrom(item.estado ?? ""),
      admissionDate: null,
      age,
      sex,
      notes: item.comentarios ? String(item.comentarios) : null,
      rowRef: `${imageId}#${i}`,
      confidence: OCR_CONFIDENCE,
    });
  });
  return out;
}

export interface OcrOptions {
  imageId: string;
  place: string;
  apiKey: string;
  model?: string;
}

const PROMPT =
  "Eres un asistente que extrae datos de listas de pacientes o sobrevivientes de un " +
  "terremoto. La imagen puede ser una foto de una lista, impresa o manuscrita. Devuelve " +
  "SOLO un arreglo JSON de personas; cada objeto con las claves: " +
  '{"nombre": "apellidos y nombres", "cedula": "solo dígitos o vacío", "edad": número o null, ' +
  '"sexo": "M" | "F" | "", "estado": "texto o vacío", "comentarios": "texto o vacío"}. ' +
  "No inventes datos: si un campo no se ve, déjalo vacío. Si la imagen NO es una lista de " +
  "personas, devuelve [].";

/** Call Gemini Flash vision on an image and return extracted records. */
export async function extractPeopleFromImage(
  buffer: Buffer,
  mime: string,
  opts: OcrOptions
): Promise<ParsedRecord[]> {
  const model = opts.model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mime, data: buffer.toString("base64") } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data: any = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return parseOcrJson(text, opts.imageId, opts.place);
}

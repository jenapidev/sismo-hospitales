import { createRequire } from "node:module";
import ExcelJS from "exceljs";

// pdf-parse's index.js runs a debug block when imported as a module; import the
// inner lib file directly to avoid it.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (b: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
};

export type DriveKind = "pdf" | "gdoc" | "gsheet" | "xlsx" | "folder" | "other";

export interface DriveFile {
  id: string;
  name: string;
  kind: DriveKind;
  /** Name of the containing folder ("" at the root) — place context for tabular files. */
  folderName?: string;
}

function classify(tooltip: string): DriveKind {
  if (/ PDF$/.test(tooltip)) return "pdf";
  if (/Google Docs$/.test(tooltip)) return "gdoc";
  if (/Google Sheets$/.test(tooltip)) return "gsheet";
  if (/Microsoft Excel$/.test(tooltip) || /\.xlsx?\b/i.test(tooltip)) return "xlsx";
  if (/older$/.test(tooltip)) return "folder";
  return "other";
}

function cleanName(tooltip: string): string {
  return tooltip
    .replace(/ (PDF|Google Docs|Google Sheets|Microsoft Excel|Shared folder|Folder)$/, "")
    .trim();
}

/** List the immediate children of a PUBLIC Drive folder by scraping. No API key. */
export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const res = await fetch(`https://drive.google.com/drive/folders/${folderId}`, { headers: UA });
  if (!res.ok) throw new Error(`listFolder ${folderId}: HTTP ${res.status}`);
  const html = await res.text();

  const re = /data-id="([\w-]{20,})"[^>]*?data-tooltip="((?:[^"\\]|\\.)*?)"/g;
  const seen = new Set<string>();
  const files: DriveFile[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    files.push({ id, name: cleanName(m[2]), kind: classify(m[2]) });
  }
  return files;
}

/** Recurse subfolders and return all non-folder files, tagged with their folder name. */
export async function listFolderTree(rootId: string, maxDepth = 3): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  const visited = new Set<string>();
  async function walk(id: string, folderName: string, depth: number) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const it of await listFolder(id)) {
      if (it.kind === "folder") {
        if (depth < maxDepth) await walk(it.id, it.name, depth + 1);
      } else {
        out.push({ ...it, folderName });
      }
    }
  }
  await walk(rootId, "", 0);
  return out;
}

/** PDF text or Google Doc plain-text export. */
export async function downloadText(file: DriveFile): Promise<string> {
  if (file.kind === "pdf") {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${file.id}`, {
      headers: UA,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`download pdf ${file.name}: HTTP ${res.status}`);
    const { text } = await pdfParse(Buffer.from(await res.arrayBuffer()));
    return text;
  }
  if (file.kind === "gdoc") {
    const res = await fetch(`https://docs.google.com/document/d/${file.id}/export?format=txt`, {
      headers: UA,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`export gdoc ${file.name}: HTTP ${res.status}`);
    return res.text();
  }
  throw new Error(`unsupported kind for ${file.name}: ${file.kind}`);
}

/** Google Sheet → CSV text. */
export async function downloadSheetCsv(id: string): Promise<string> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`, {
    headers: UA,
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`export sheet ${id}: HTTP ${res.status}`);
  return res.text();
}

/** Excel (.xlsx) → rows of the first worksheet as strings. */
export async function downloadXlsxRows(id: string): Promise<string[][]> {
  const res = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, {
    headers: UA,
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`download xlsx ${id}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as never);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (c) => cells.push((c.text ?? "").toString()));
    rows.push(cells);
  });
  return rows;
}

/** Minimal CSV → rows parser (handles quoted commas/newlines and "" escapes). */
export function csvToRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Files we ingest for the registry sync (everything text-extractable, not images). */
export function isSyncable(file: DriveFile): boolean {
  return ["pdf", "gdoc", "gsheet", "xlsx"].includes(file.kind);
}
